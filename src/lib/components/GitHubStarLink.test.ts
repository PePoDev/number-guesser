import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import GitHubStarLink from './GitHubStarLink.svelte'
import { gameStore } from '$lib/stores/gameStore'

const repoUrl = 'https://github.com/PePoDev/number-guesser'
const apiUrl = 'https://api.github.com/repos/PePoDev/number-guesser'

afterEach(() => {
	vi.unstubAllGlobals()
	gameStore.reset()
})

it('shows an accessible repository link while stars are loading', () => {
	vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))

	render(GitHubStarLink)

	const link = screen.getByRole('link', {
		name: 'Open number-guesser on GitHub',
	})
	expect(link).toHaveAttribute('href', repoUrl)
	expect(link.textContent?.trim()).toBe('')
})

it('exposes the live GitHub star count in the name and tooltip', async () => {
	const fetchMock = vi.fn(async () => ({
		ok: true,
		json: async () => ({ stargazers_count: 128 }),
	}))
	vi.stubGlobal('fetch', fetchMock)

	render(GitHubStarLink)

	const link = await screen.findByRole('link', {
		name: 'Open number-guesser on GitHub, 128 stars',
	})
	expect(link).toHaveAttribute('href', repoUrl)
	expect(link).toHaveAttribute(
		'title',
		'Open number-guesser on GitHub, 128 stars',
	)
	expect(link.textContent?.trim()).toBe('')
	expect(fetchMock).toHaveBeenCalledWith(apiUrl, {
		headers: {
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2026-03-10',
		},
	})
})

it.each([
	[
		'a failed request',
		vi.fn(async () => {
			throw new Error('offline')
		}),
	],
	[
		'a non-success response',
		vi.fn(async () => ({
			ok: false,
			json: async () => ({ message: 'rate limited' }),
		})),
	],
	[
		'a malformed response',
		vi.fn(async () => ({
			ok: true,
			json: async () => ({ stargazers_count: 'many' }),
		})),
	],
])('keeps the fallback link after %s', async (_scenario, fetchMock) => {
	vi.stubGlobal('fetch', fetchMock)

	render(GitHubStarLink)

	await waitFor(() => expect(fetchMock).toHaveBeenCalled())
	expect(
		screen.getByRole('link', { name: 'Open number-guesser on GitHub' }),
	).toHaveAttribute('href', repoUrl)
	expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
})

it('labels the link in Thai', async () => {
	gameStore.setLocale('th')
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({
			ok: true,
			json: async () => ({ stargazers_count: 128 }),
		})),
	)

	render(GitHubStarLink)

	expect(
		await screen.findByRole('link', {
			name: 'เปิด number-guesser บน GitHub, 128 ดาว',
		}),
	).toHaveAttribute('title', 'เปิด number-guesser บน GitHub, 128 ดาว')
})

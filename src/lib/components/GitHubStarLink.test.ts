import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import GitHubStarLink from './GitHubStarLink.svelte'

const repoUrl = 'https://github.com/PePoDev/number-guesser'
const apiUrl = 'https://api.github.com/repos/PePoDev/number-guesser'

afterEach(() => {
	vi.unstubAllGlobals()
})

it('shows an accessible repository link while stars are loading', () => {
	vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))

	render(GitHubStarLink)

	expect(
		screen.getByRole('link', { name: 'Open number-guesser on GitHub' }),
	).toHaveAttribute('href', repoUrl)
})

it('shows the live GitHub star count', async () => {
	const fetchMock = vi.fn(async () => ({
		ok: true,
		json: async () => ({ stargazers_count: 128 }),
	}))
	vi.stubGlobal('fetch', fetchMock)

	render(GitHubStarLink)

	expect(
		await screen.findByRole('link', {
			name: 'Open number-guesser on GitHub, 128 stars',
		}),
	).toHaveAttribute('href', repoUrl)
	expect(screen.getByText('128')).toBeInTheDocument()
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

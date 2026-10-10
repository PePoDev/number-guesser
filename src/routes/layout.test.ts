import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import Layout from './+layout.svelte'
import { gameStore } from '$lib/stores/gameStore'

describe('+layout.svelte locale bootstrap', () => {
	beforeEach(() => {
		gameStore.reset()
		localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		localStorage.clear()
		document.documentElement.lang = 'en'
	})

	it('starts in the saved language and tags the document', async () => {
		localStorage.setItem('number-guessing-locale', 'th')

		render(Layout)

		expect(get(gameStore).locale).toBe('th')
		await waitFor(() => {
			expect(document.documentElement.lang).toBe('th')
		})
	})

	it('follows a Thai browser when nothing is saved', () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['th-TH', 'en'])

		render(Layout)

		expect(get(gameStore).locale).toBe('th')
	})

	it('keeps the document language in sync with later switches', async () => {
		render(Layout)
		expect(get(gameStore).locale).toBe('en')

		gameStore.setLocale('th')

		await waitFor(() => {
			expect(document.documentElement.lang).toBe('th')
		})
	})
})

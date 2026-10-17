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

	it('follows an English browser when nothing is saved', () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])

		render(Layout)

		expect(get(gameStore).locale).toBe('en')
	})

	it('starts in Thai when the browser language is not supported', async () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de-DE'])

		render(Layout)

		expect(get(gameStore).locale).toBe('th')
		await waitFor(() => {
			expect(document.documentElement.lang).toBe('th')
		})
	})

	it('keeps the document language in sync with later switches', async () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
		render(Layout)
		expect(get(gameStore).locale).toBe('en')

		gameStore.setLocale('th')

		await waitFor(() => {
			expect(document.documentElement.lang).toBe('th')
		})
	})
})

describe('+layout.svelte sound bootstrap', () => {
	beforeEach(() => {
		gameStore.reset()
		localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		localStorage.clear()
		document.documentElement.lang = 'en'
	})

	it('starts with sound effects off when the player turned them off', () => {
		localStorage.setItem('number-guessing-sound', 'off')

		render(Layout)

		expect(get(gameStore).sound).toBe(false)
	})

	it('starts with sound effects on when nothing is saved', () => {
		gameStore.setSound(false)

		render(Layout)

		expect(get(gameStore).sound).toBe(true)
	})
})

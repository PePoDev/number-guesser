import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	LOCALE_STORAGE_KEY,
	detectLocale,
	readStoredLocale,
	resolveLocale,
	storeLocale,
} from './locale'

afterEach(() => {
	vi.restoreAllMocks()
	localStorage.clear()
})

describe('resolveLocale', () => {
	it('prefers a saved locale over the browser languages', () => {
		expect(resolveLocale('th', ['en-US'])).toBe('th')
		expect(resolveLocale('en', ['th-TH'])).toBe('en')
	})

	it('uses the first supported browser language', () => {
		expect(resolveLocale(null, ['fr-FR', 'th-TH', 'en-US'])).toBe('th')
		expect(resolveLocale(null, ['fr-FR', 'en-US', 'th-TH'])).toBe('en')
		expect(resolveLocale(null, ['en-US'])).toBe('en')
		expect(resolveLocale(null, ['EN-gb'])).toBe('en')
	})

	it('ignores unsupported saved values and falls back to Thai', () => {
		expect(resolveLocale('fr', ['de-DE'])).toBe('th')
		expect(resolveLocale(null, ['fr-FR'])).toBe('th')
		expect(resolveLocale(null, [])).toBe('th')
	})
})

describe('locale persistence', () => {
	it('saves and reads the chosen locale', () => {
		storeLocale('th')

		expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('th')
		expect(readStoredLocale()).toBe('th')
	})

	it('keeps working when storage is unavailable', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked')
		})

		expect(() => storeLocale('th')).not.toThrow()
		expect(readStoredLocale()).toBeNull()
	})

	it('detects Thai from the browser when nothing is saved', () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['th-TH', 'en'])

		expect(detectLocale()).toBe('th')
	})

	it('detects the saved locale before the browser language', () => {
		storeLocale('en')
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['th-TH'])

		expect(detectLocale()).toBe('en')
	})

	it('detects an English browser when nothing is saved', () => {
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])

		expect(detectLocale()).toBe('en')
	})

	it('starts in Thai when neither the saved choice nor the browser is supported', () => {
		localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
		vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'de-DE'])

		expect(detectLocale()).toBe('th')
	})
})

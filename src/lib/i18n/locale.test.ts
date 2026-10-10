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
		expect(resolveLocale(null, ['EN-gb'])).toBe('en')
	})

	it('ignores unsupported saved values and falls back to English', () => {
		expect(resolveLocale('fr', ['de-DE'])).toBe('en')
		expect(resolveLocale(null, [])).toBe('en')
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
})

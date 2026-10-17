import { locales, type Locale } from './messages'

export const LOCALE_STORAGE_KEY = 'number-guessing-locale'

export function isLocale(value: unknown): value is Locale {
	return (
		typeof value === 'string' &&
		(locales as readonly string[]).includes(value)
	)
}

export function resolveLocale(
	stored: string | null,
	languages: readonly string[],
): Locale {
	if (isLocale(stored)) {
		return stored
	}
	for (const language of languages) {
		const base = language.toLowerCase().split('-')[0]
		if (isLocale(base)) {
			return base
		}
	}
	return 'th'
}

// Storage can throw in private browsing or with blocked site data; the
// language then still applies for the current visit.
export function readStoredLocale(): string | null {
	try {
		return localStorage.getItem(LOCALE_STORAGE_KEY)
	} catch {
		return null
	}
}

export function storeLocale(locale: Locale): void {
	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, locale)
	} catch {
		return
	}
}

export function detectLocale(): Locale {
	return resolveLocale(
		readStoredLocale(),
		navigator.languages ?? [navigator.language],
	)
}

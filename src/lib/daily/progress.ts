import {
	DAILY_DIGITS,
	DAILY_TRIES,
	EMPTY_DAILY_STATS,
	dailyTarget,
	type DailyProgress,
	type DailyStats,
} from '$lib/stores/gameStore'

export const DAILY_STORAGE_KEY = 'number-guessing-daily'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function count(value: unknown): number {
	return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
}

function readStats(value: unknown): DailyStats {
	if (!isRecord(value)) {
		return EMPTY_DAILY_STATS
	}
	const distribution = Array.isArray(value.distribution) ? value.distribution : []
	return {
		played: count(value.played),
		wins: count(value.wins),
		currentStreak: count(value.currentStreak),
		maxStreak: count(value.maxStreak),
		distribution: Array.from({ length: DAILY_TRIES }, (_, index) =>
			count(distribution[index]),
		),
		lastPlayedDay: count(value.lastPlayedDay),
		lastWonDay: count(value.lastWonDay),
	}
}

// Guesses carry over only for the same puzzle, and stop at the answer, so a
// hand-edited or stale entry can never show more than one finished board.
function readGuesses(value: unknown, day: number): string[] {
	if (!Array.isArray(value)) {
		return []
	}
	const pattern = new RegExp(`^\\d{${DAILY_DIGITS}}$`)
	const guesses = value
		.filter((guess): guess is string => typeof guess === 'string' && pattern.test(guess))
		.slice(0, DAILY_TRIES)
	const solved = guesses.indexOf(dailyTarget(day))
	return solved === -1 ? guesses : guesses.slice(0, solved + 1)
}

function parseJson(raw: string | null): unknown {
	try {
		return raw === null ? null : JSON.parse(raw)
	} catch {
		return null
	}
}

export function parseDailyProgress(raw: string | null, day: number): DailyProgress {
	const saved = parseJson(raw)
	if (!isRecord(saved)) {
		return { day, guesses: [], stats: EMPTY_DAILY_STATS }
	}
	return {
		day,
		guesses: saved.day === day ? readGuesses(saved.guesses, day) : [],
		stats: readStats(saved.stats),
	}
}

// Storage can throw in private browsing or with blocked site data; the
// puzzle then still works for the current visit.
export function readDailyProgress(day: number): DailyProgress {
	try {
		return parseDailyProgress(localStorage.getItem(DAILY_STORAGE_KEY), day)
	} catch {
		return parseDailyProgress(null, day)
	}
}

export function saveDailyProgress(progress: DailyProgress): void {
	try {
		localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(progress))
	} catch {
		return
	}
}

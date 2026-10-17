import { afterEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import {
	EMPTY_DAILY_STATS,
	dailyTarget,
	gameStore,
	recordDailyResult,
} from '$lib/stores/gameStore'
import {
	DAILY_STORAGE_KEY,
	parseDailyProgress,
	readDailyProgress,
	saveDailyProgress,
} from './progress'

afterEach(() => {
	vi.restoreAllMocks()
	localStorage.clear()
	gameStore.reset()
})

describe('parseDailyProgress', () => {
	it('starts a fresh puzzle when nothing is saved', () => {
		expect(parseDailyProgress(null, 3)).toEqual({
			day: 3,
			guesses: [],
			stats: EMPTY_DAILY_STATS,
		})
		expect(parseDailyProgress('not json', 3).guesses).toEqual([])
	})

	it("keeps today's guesses and the stats", () => {
		const stats = recordDailyResult(EMPTY_DAILY_STATS, 2, true, 1)
		const saved = JSON.stringify({ day: 3, guesses: ['123'], stats })

		expect(parseDailyProgress(saved, 3)).toEqual({ day: 3, guesses: ['123'], stats })
	})

	it("drops another day's guesses but keeps the stats", () => {
		const stats = recordDailyResult(EMPTY_DAILY_STATS, 2, true, 1)
		const saved = JSON.stringify({ day: 2, guesses: [dailyTarget(2)], stats })

		expect(parseDailyProgress(saved, 3)).toEqual({ day: 3, guesses: [], stats })
	})

	it('discards malformed guesses and anything after the answer', () => {
		const saved = JSON.stringify({
			day: 1,
			guesses: ['12', '1234', 'abc', 123, '111', dailyTarget(1), '222'],
		})

		expect(parseDailyProgress(saved, 1).guesses).toEqual(['111', dailyTarget(1)])
	})

	it('drops 5-digit guesses saved before Guessle went to 3 digits but keeps the stats', () => {
		const stats = recordDailyResult(EMPTY_DAILY_STATS, 4, true, 2)
		localStorage.setItem(
			DAILY_STORAGE_KEY,
			JSON.stringify({ day: 4, guesses: ['12345', '30937'], stats }),
		)

		const progress = readDailyProgress(4)
		expect(progress).toEqual({ day: 4, guesses: [], stats })

		gameStore.loadDaily(progress)
		gameStore.addDailyGuess(dailyTarget(4))
		expect(get(gameStore).daily).toEqual({ day: 4, guesses: [dailyTarget(4)], stats })
	})

	it('repairs malformed stats field by field', () => {
		const saved = JSON.stringify({
			day: 1,
			stats: { played: 4, wins: -1, maxStreak: 2.5, distribution: [1, 'x'] },
		})

		expect(parseDailyProgress(saved, 1).stats).toEqual({
			...EMPTY_DAILY_STATS,
			played: 4,
			distribution: [1, 0, 0, 0, 0, 0],
		})
	})
})

describe('daily progress storage', () => {
	it('saves and reads progress', () => {
		const progress = { day: 5, guesses: ['123'], stats: EMPTY_DAILY_STATS }
		saveDailyProgress(progress)

		expect(JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) ?? '')).toEqual(progress)
		expect(readDailyProgress(5)).toEqual(progress)
	})

	it('keeps working when storage is unavailable', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked')
		})

		expect(() =>
			saveDailyProgress({ day: 1, guesses: [], stats: EMPTY_DAILY_STATS }),
		).not.toThrow()
		expect(readDailyProgress(1).guesses).toEqual([])
	})
})

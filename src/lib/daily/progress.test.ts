import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_DAILY_STATS, dailyTarget, recordDailyResult } from '$lib/stores/gameStore'
import {
	DAILY_STORAGE_KEY,
	parseDailyProgress,
	readDailyProgress,
	saveDailyProgress,
} from './progress'

afterEach(() => {
	vi.restoreAllMocks()
	localStorage.clear()
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
		const saved = JSON.stringify({ day: 3, guesses: ['12345'], stats })

		expect(parseDailyProgress(saved, 3)).toEqual({ day: 3, guesses: ['12345'], stats })
	})

	it("drops another day's guesses but keeps the stats", () => {
		const stats = recordDailyResult(EMPTY_DAILY_STATS, 2, true, 1)
		const saved = JSON.stringify({ day: 2, guesses: [dailyTarget(2)], stats })

		expect(parseDailyProgress(saved, 3)).toEqual({ day: 3, guesses: [], stats })
	})

	it('discards malformed guesses and anything after the answer', () => {
		const saved = JSON.stringify({
			day: 1,
			guesses: ['1234', 'abcde', 12345, '11111', dailyTarget(1), '22222'],
		})

		expect(parseDailyProgress(saved, 1).guesses).toEqual(['11111', dailyTarget(1)])
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
		const progress = { day: 5, guesses: ['12345'], stats: EMPTY_DAILY_STATS }
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

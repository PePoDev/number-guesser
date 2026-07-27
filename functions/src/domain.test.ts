import { describe, expect, it } from 'vitest'
import {
	calculateFeedback,
	normalizeRoomId,
	resolveGuess,
	validateDigitCount,
	validateGuess,
	validateMaxPlayers,
	validateName,
} from './domain.js'

describe('online room domain', () => {
	it('normalizes a room id', () => {
		expect(normalizeRoomId(' ab2c3d ')).toBe('AB2C3D')
	})

	it('rejects malformed room ids', () => {
		expect(() => normalizeRoomId('ABC')).toThrow('ROOM_ID_INVALID')
	})

	it('validates names and settings', () => {
		expect(validateName(' Ada ')).toBe('Ada')
		expect(validateDigitCount(5)).toBe(5)
		expect(validateMaxPlayers(4)).toBe(4)
		expect(() => validateName('')).toThrow('NAME_INVALID')
		expect(() => validateDigitCount(6)).toThrow('DIGIT_COUNT_INVALID')
		expect(() => validateMaxPlayers(1)).toThrow('PLAYER_COUNT_INVALID')
	})

	it('validates and pads numeric guesses', () => {
		expect(validateGuess('7', 3)).toBe('007')
		expect(() => validateGuess('7x', 3)).toThrow('GUESS_INVALID')
	})

	it('counts duplicate digits consistently', () => {
		expect(calculateFeedback('112', '121')).toEqual({
			correctDigits: 3,
			correctPositions: 1,
		})
	})

	it('keeps the turn after a correct elimination', () => {
		expect(
			resolveGuess({
				playerOrder: ['host', 'p2', 'p3'],
				eliminatedUids: [],
				currentGuesserUid: 'host',
				targetUid: 'p2',
				guess: '123',
				targetNumber: '123',
			}),
		).toEqual({
			correct: true,
			correctDigits: 3,
			correctPositions: 3,
			eliminatedUid: 'p2',
			nextGuesserUid: 'host',
			winnerUid: null,
		})
	})

	it('rotates after an incorrect guess', () => {
		expect(
			resolveGuess({
				playerOrder: ['host', 'p2', 'p3'],
				eliminatedUids: ['p2'],
				currentGuesserUid: 'host',
				targetUid: 'p3',
				guess: '111',
				targetNumber: '123',
			}),
		).toMatchObject({
			correct: false,
			nextGuesserUid: 'p3',
			winnerUid: null,
		})
	})

	it('declares the final active player as winner', () => {
		expect(
			resolveGuess({
				playerOrder: ['host', 'p2'],
				eliminatedUids: [],
				currentGuesserUid: 'host',
				targetUid: 'p2',
				guess: '123',
				targetNumber: '123',
			}),
		).toMatchObject({
			eliminatedUid: 'p2',
			nextGuesserUid: null,
			winnerUid: 'host',
		})
	})
})

import { describe, expect, it } from 'vitest'
import {
	IDLE_TURN_SECONDS,
	calculateFeedback,
	isTurnIdle,
	normalizeRoomId,
	resolveForfeit,
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
		expect(() => validateGuess('1234', 3)).toThrow('GUESS_INVALID')
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

	it('wraps rotation past the end of a four-player order and skips eliminated players', () => {
		expect(
			resolveGuess({
				playerOrder: ['host', 'p2', 'p3', 'p4'],
				eliminatedUids: ['host', 'p2'],
				currentGuesserUid: 'p4',
				targetUid: 'p3',
				guess: '111',
				targetNumber: '123',
			}),
		).toMatchObject({ nextGuesserUid: 'p3', winnerUid: null })
	})
})

describe('forfeits', () => {
	it('passes the turn to the next active player when the current guesser forfeits', () => {
		expect(
			resolveForfeit({
				playerOrder: ['host', 'p2', 'p3', 'p4'],
				eliminatedUids: ['p3'],
				currentGuesserUid: 'p2',
				hostUid: 'host',
				forfeitUid: 'p2',
			}),
		).toEqual({ hostUid: 'host', currentGuesserUid: 'p4', winnerUid: null })
	})

	it('keeps the turn when another player forfeits', () => {
		expect(
			resolveForfeit({
				playerOrder: ['host', 'p2', 'p3'],
				eliminatedUids: [],
				currentGuesserUid: 'p3',
				hostUid: 'host',
				forfeitUid: 'p2',
			}),
		).toEqual({ hostUid: 'host', currentGuesserUid: 'p3', winnerUid: null })
	})

	it('moves the host to the first active player', () => {
		expect(
			resolveForfeit({
				playerOrder: ['host', 'p2', 'p3', 'p4'],
				eliminatedUids: ['p2'],
				currentGuesserUid: 'p4',
				hostUid: 'host',
				forfeitUid: 'host',
			}),
		).toEqual({ hostUid: 'p3', currentGuesserUid: 'p4', winnerUid: null })
	})

	it('declares the last active player the winner', () => {
		expect(
			resolveForfeit({
				playerOrder: ['host', 'p2', 'p3'],
				eliminatedUids: ['p3'],
				currentGuesserUid: 'host',
				hostUid: 'host',
				forfeitUid: 'host',
			}),
		).toEqual({ hostUid: 'p2', currentGuesserUid: null, winnerUid: 'p2' })
	})
})

describe('idle turns', () => {
	it('treats a turn as idle once IDLE_TURN_SECONDS have passed', () => {
		expect(IDLE_TURN_SECONDS).toBe(120)
		expect(isTurnIdle(1_000, 1_000 + 119_999)).toBe(false)
		expect(isTurnIdle(1_000, 1_000 + 120_000)).toBe(true)
	})
})

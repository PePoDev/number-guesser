export type DomainErrorCode =
	| 'ROOM_ID_INVALID'
	| 'NAME_INVALID'
	| 'DIGIT_COUNT_INVALID'
	| 'PLAYER_COUNT_INVALID'
	| 'GUESS_INVALID'

export class DomainError extends Error {
	constructor(public readonly code: DomainErrorCode) {
		super(code)
	}
}

const roomIdPattern = /^[A-Z2-9]{6}$/

export function normalizeRoomId(value: unknown): string {
	if (typeof value !== 'string') {
		throw new DomainError('ROOM_ID_INVALID')
	}
	const roomId = value.trim().toUpperCase()
	if (!roomIdPattern.test(roomId)) {
		throw new DomainError('ROOM_ID_INVALID')
	}
	return roomId
}

export function validateName(value: unknown): string {
	if (typeof value !== 'string') {
		throw new DomainError('NAME_INVALID')
	}
	const name = value.trim()
	if (name.length < 1 || name.length > 20) {
		throw new DomainError('NAME_INVALID')
	}
	return name
}

export function validateDigitCount(value: unknown): number {
	if (!Number.isInteger(value) || Number(value) < 2 || Number(value) > 5) {
		throw new DomainError('DIGIT_COUNT_INVALID')
	}
	return Number(value)
}

export function validateMaxPlayers(value: unknown): number {
	if (!Number.isInteger(value) || Number(value) < 2 || Number(value) > 4) {
		throw new DomainError('PLAYER_COUNT_INVALID')
	}
	return Number(value)
}

export function validateGuess(value: unknown, digitCount: number): string {
	if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
		throw new DomainError('GUESS_INVALID')
	}
	const guess = value.trim().padStart(digitCount, '0')
	if (guess.length !== digitCount) {
		throw new DomainError('GUESS_INVALID')
	}
	return guess
}

export function calculateFeedback(
	guess: string,
	target: string,
): { correctDigits: number; correctPositions: number } {
	let correctPositions = 0
	const guessCounts: Record<string, number> = {}
	const targetCounts: Record<string, number> = {}

	for (let index = 0; index < guess.length; index += 1) {
		if (guess[index] === target[index]) {
			correctPositions += 1
		}
		guessCounts[guess[index]] = (guessCounts[guess[index]] ?? 0) + 1
		targetCounts[target[index]] = (targetCounts[target[index]] ?? 0) + 1
	}

	const correctDigits = Object.entries(guessCounts).reduce(
		(total, [digit, count]) => total + Math.min(count, targetCounts[digit] ?? 0),
		0,
	)

	return { correctDigits, correctPositions }
}

interface ResolveGuessInput {
	playerOrder: string[]
	eliminatedUids: string[]
	currentGuesserUid: string
	targetUid: string
	guess: string
	targetNumber: string
}

interface GuessResolution {
	correct: boolean
	correctDigits: number
	correctPositions: number
	eliminatedUid: string | null
	nextGuesserUid: string | null
	winnerUid: string | null
}

export function resolveGuess(input: ResolveGuessInput): GuessResolution {
	const feedback = calculateFeedback(input.guess, input.targetNumber)
	const correct = input.guess === input.targetNumber
	const eliminated = new Set(input.eliminatedUids)

	if (correct) {
		eliminated.add(input.targetUid)
	}

	const active = input.playerOrder.filter((uid) => !eliminated.has(uid))
	const winnerUid = active.length === 1 ? active[0] : null

	if (winnerUid) {
		return {
			correct,
			...feedback,
			eliminatedUid: correct ? input.targetUid : null,
			nextGuesserUid: null,
			winnerUid,
		}
	}

	if (correct) {
		return {
			correct,
			...feedback,
			eliminatedUid: input.targetUid,
			nextGuesserUid: input.currentGuesserUid,
			winnerUid: null,
		}
	}

	const currentIndex = input.playerOrder.indexOf(input.currentGuesserUid)
	let nextIndex = (currentIndex + 1) % input.playerOrder.length
	while (eliminated.has(input.playerOrder[nextIndex])) {
		nextIndex = (nextIndex + 1) % input.playerOrder.length
	}

	return {
		correct,
		...feedback,
		eliminatedUid: null,
		nextGuesserUid: input.playerOrder[nextIndex],
		winnerUid: null,
	}
}

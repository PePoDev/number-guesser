export type OnlineRoomPhase = 'lobby' | 'guessing' | 'finished'
export type OnlineConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'reconnecting'
	| 'error'

export interface OnlineRoom {
	id: string
	hostUid: string
	phase: OnlineRoomPhase
	digitCount: number
	maxPlayers: number
	playerOrder: string[]
	currentGuesserUid: string | null
	winnerUid: string | null
	turnNumber: number
}

export interface OnlinePlayer {
	uid: string
	name: string
	seat: number
	ready: boolean
	eliminated: boolean
}

export interface OnlineGuess {
	id: string
	turnNumber: number
	guesserUid: string
	targetUid: string
	guess: string
	correct: boolean
	correctDigits: number
	correctPositions: number
}

export interface OnlineSnapshot {
	room: OnlineRoom
	players: OnlinePlayer[]
	guesses: OnlineGuess[]
}

export const ONLINE_ERROR_CODES = [
	'AUTH_REQUIRED',
	'NAME_INVALID',
	'DIGIT_COUNT_INVALID',
	'PLAYER_COUNT_INVALID',
	'ROOM_ID_INVALID',
	'ROOM_NOT_FOUND',
	'ROOM_FULL',
	'ROOM_ALREADY_STARTED',
	'HOST_REQUIRED',
	'ROOM_NOT_READY',
	'ROOM_NOT_GUESSING',
	'ROOM_NOT_FINISHED',
	'ACTIVE_MATCH_LEAVE_DENIED',
	'GUESS_INVALID',
	'GUESS_INPUT_INVALID',
	'TURN_STALE',
	'TARGET_INVALID',
	'TARGET_ELIMINATED',
	'ONLINE_GAME_INTERNAL',
	'CONNECTION_INTERRUPTED',
	'ROOM_CHANGED',
	'RESTORE_FAILED',
	'CLIPBOARD_FAILED',
	'ONLINE_UNAVAILABLE',
] as const

export type OnlineErrorCode = (typeof ONLINE_ERROR_CODES)[number]

export function isOnlineErrorCode(value: string): value is OnlineErrorCode {
	return (ONLINE_ERROR_CODES as readonly string[]).includes(value)
}

export interface OnlineGameState {
	status: OnlineConnectionStatus
	uid: string
	roomId: string
	room: OnlineRoom | null
	players: OnlinePlayer[]
	guesses: OnlineGuess[]
	error: OnlineErrorCode | ''
}

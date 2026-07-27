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

export interface OnlineGameState {
	status: OnlineConnectionStatus
	uid: string
	roomId: string
	room: OnlineRoom | null
	players: OnlinePlayer[]
	guesses: OnlineGuess[]
	error: string
}

import { signInAnonymously } from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseClient } from '$lib/firebase/client'
import type {
	OnlineGuess,
	OnlinePlayer,
	OnlineRoom,
	OnlineSnapshot,
} from '$lib/online/types'

export interface OnlineGameService {
	restoreSession(): Promise<{ uid: string; roomId: string } | null>
	createRoom(input: {
		name: string
		digitCount: number
		maxPlayers: number
	}): Promise<{ uid: string; roomId: string }>
	joinRoom(input: {
		name: string
		roomId: string
	}): Promise<{ uid: string; roomId: string }>
	setSecret(input: { roomId: string; number: string }): Promise<void>
	startRoom(roomId: string): Promise<void>
	submitGuess(input: {
		roomId: string
		targetUid: string
		guess: string
		turnNumber: number
	}): Promise<void>
	leaveRoom(roomId: string): Promise<void>
	restartRoom(roomId: string): Promise<void>
	clearSession(): void
	subscribeToRoom(
		roomId: string,
		onValue: (snapshot: OnlineSnapshot) => void,
		onError: (message: string) => void,
	): () => void
}

interface RawSnapshot {
	roomId: string
	room: Record<string, unknown>
	players: Array<{ id: string; data: Record<string, unknown> }>
	guesses: Array<{ id: string; data: Record<string, unknown> }>
}

export interface OnlineGameDependencies {
	ensureUser(): Promise<string>
	call(name: string, input: Record<string, unknown>): Promise<unknown>
	subscribeRoom(
		roomId: string,
		onValue: (snapshot: OnlineSnapshot) => void,
		onError: (message: string) => void,
	): () => void
	getStoredRoomId(): string
	setStoredRoomId(roomId: string): void
	clearStoredRoomId(): void
}

const messages: Record<string, string> = {
	AUTH_REQUIRED: 'Could not sign in. Please retry.',
	NAME_INVALID: 'Enter a name between 1 and 20 characters.',
	DIGIT_COUNT_INVALID: 'Choose between two and five digits.',
	PLAYER_COUNT_INVALID: 'Choose between two and four players.',
	ROOM_ID_INVALID: 'Enter a valid six-character room ID.',
	ROOM_NOT_FOUND: 'Room not found or expired.',
	ROOM_FULL: 'This room is full.',
	ROOM_ALREADY_STARTED: 'This room has already started.',
	ROOM_MEMBERSHIP_REQUIRED: 'Room not found or expired.',
	HOST_REQUIRED: 'Only the host can do that.',
	ROOM_NOT_READY: 'The room is not ready to start.',
	ROOM_NOT_GUESSING: 'This game is not accepting guesses.',
	ROOM_NOT_FINISHED: 'The game must finish before restarting.',
	ACTIVE_MATCH_LEAVE_DENIED: 'You cannot leave during an active match.',
	GUESS_INVALID: 'Enter a number with the configured digit count.',
	GUESS_INPUT_INVALID: 'Enter a valid guess and target.',
	TURN_STALE: 'The turn changed. Try again.',
	TARGET_INVALID: 'Choose an active opponent.',
	TARGET_ELIMINATED: 'That player has already been eliminated.',
	ONLINE_GAME_INTERNAL: 'Something went wrong. Please retry.',
}

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return value as Record<string, unknown>
}

function string(value: unknown): string {
	if (typeof value !== 'string') {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return value
}

function nullableString(value: unknown): string | null {
	if (value === null) {
		return null
	}
	return string(value)
}

function number(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return value
}

function boolean(value: unknown): boolean {
	if (typeof value !== 'boolean') {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return value
}

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return [...value]
}

function decodeRoom(id: string, value: unknown): OnlineRoom {
	const data = record(value)
	const phase = string(data.phase)
	if (phase !== 'lobby' && phase !== 'guessing' && phase !== 'finished') {
		throw new Error('ONLINE_SNAPSHOT_INVALID')
	}
	return {
		id,
		hostUid: string(data.hostUid),
		phase,
		digitCount: number(data.digitCount),
		maxPlayers: number(data.maxPlayers),
		playerOrder: stringArray(data.playerOrder),
		currentGuesserUid: nullableString(data.currentGuesserUid),
		winnerUid: nullableString(data.winnerUid),
		turnNumber: number(data.turnNumber),
	}
}

function decodePlayer(id: string, value: unknown): OnlinePlayer {
	const data = record(value)
	return {
		uid: id,
		name: string(data.name),
		seat: number(data.seat),
		ready: boolean(data.ready),
		eliminated: boolean(data.eliminated),
	}
}

function decodeGuess(id: string, value: unknown): OnlineGuess {
	const data = record(value)
	return {
		id,
		turnNumber: number(data.turnNumber),
		guesserUid: string(data.guesserUid),
		targetUid: string(data.targetUid),
		guess: string(data.guess),
		correct: boolean(data.correct),
		correctDigits: number(data.correctDigits),
		correctPositions: number(data.correctPositions),
	}
}

export function decodeOnlineSnapshot(raw: RawSnapshot): OnlineSnapshot {
	return {
		room: decodeRoom(raw.roomId, raw.room),
		players: raw.players
			.map((player) => decodePlayer(player.id, player.data))
			.sort((left, right) => left.seat - right.seat),
		guesses: raw.guesses
			.map((guess) => decodeGuess(guess.id, guess.data))
			.sort((left, right) => left.turnNumber - right.turnNumber),
	}
}

export function mapOnlineGameError(error: unknown): string {
	if (!error || typeof error !== 'object' || Array.isArray(error)) {
		return messages.ONLINE_GAME_INTERNAL
	}
	const data = error as Record<string, unknown>
	const code = typeof data.code === 'string' ? data.code : ''
	if (code.endsWith('/unavailable') || code === 'unavailable') {
		return 'Connection interrupted. Reconnecting…'
	}
	if (code.endsWith('/aborted') || code === 'aborted') {
		return 'The room changed. Please retry.'
	}
	const message = typeof data.message === 'string' ? data.message : ''
	const reason = Object.keys(messages).find((key) => message.includes(key))
	return reason ? messages[reason] : messages.ONLINE_GAME_INTERNAL
}

function roomIdResult(value: unknown): string {
	return string(record(value).roomId)
}

function commandError(error: unknown): Error {
	return new Error(mapOnlineGameError(error))
}

export function createOnlineGameService(
	dependencies: OnlineGameDependencies,
): OnlineGameService {
	async function ensureUser(): Promise<string> {
		try {
			return await dependencies.ensureUser()
		} catch (error) {
			throw commandError(error)
		}
	}

	async function run(
		name: string,
		input: Record<string, unknown>,
	): Promise<unknown> {
		await ensureUser()
		try {
			return await dependencies.call(name, input)
		} catch (error) {
			throw commandError(error)
		}
	}

	return {
		async restoreSession() {
			const roomId = dependencies.getStoredRoomId()
			if (!roomId) {
				return null
			}
			return { uid: await ensureUser(), roomId }
		},
		async createRoom(input) {
			const uid = await ensureUser()
			const roomId = roomIdResult(await run('createRoom', input))
			dependencies.setStoredRoomId(roomId)
			return { uid, roomId }
		},
		async joinRoom(input) {
			const uid = await ensureUser()
			const normalized = {
				...input,
				roomId: input.roomId.trim().toUpperCase(),
			}
			const roomId = roomIdResult(await run('joinRoom', normalized))
			dependencies.setStoredRoomId(roomId)
			return { uid, roomId }
		},
		async setSecret(input) {
			await run('setSecret', input)
		},
		async startRoom(roomId) {
			await run('startRoom', { roomId })
		},
		async submitGuess(input) {
			await run('submitGuess', input)
		},
		async leaveRoom(roomId) {
			await run('leaveRoom', { roomId })
			dependencies.clearStoredRoomId()
		},
		async restartRoom(roomId) {
			await run('restartRoom', { roomId })
		},
		clearSession() {
			dependencies.clearStoredRoomId()
		},
		subscribeToRoom(roomId, onValue, onError) {
			return dependencies.subscribeRoom(roomId, onValue, onError)
		},
	}
}

async function ensureFirebaseUser(): Promise<string> {
	const { auth } = await getFirebaseClient()
	await auth.authStateReady()
	if (auth.currentUser) {
		return auth.currentUser.uid
	}
	return (await signInAnonymously(auth)).user.uid
}

async function callFirebase(
	name: string,
	input: Record<string, unknown>,
): Promise<unknown> {
	const { functions } = await getFirebaseClient()
	return (
		await httpsCallable<Record<string, unknown>, unknown>(
			functions,
			name,
		)(input)
	).data
}

function subscriptionMessage(error: unknown): string {
	if (
		error &&
		typeof error === 'object' &&
		'code' in error &&
		error.code === 'permission-denied'
	) {
		return 'Room not found or expired.'
	}
	return mapOnlineGameError(error)
}

function subscribeFirebaseRoom(
	roomId: string,
	onValue: (snapshot: OnlineSnapshot) => void,
	onError: (message: string) => void,
): () => void {
	let room: Record<string, unknown> | null = null
	let players: RawSnapshot['players'] = []
	let guesses: RawSnapshot['guesses'] = []
	let cancelled = false
	const unsubscribers: Array<() => void> = []

	function emit(): void {
		if (room) {
			onValue(decodeOnlineSnapshot({ roomId, room, players, guesses }))
		}
	}

	void getFirebaseClient()
		.then(({ firestore }) => {
			const subscriptions = [
				onSnapshot(
					doc(firestore, 'rooms', roomId),
					(snapshot) => {
						if (!snapshot.exists()) {
							onError('Room not found or expired.')
							return
						}
						room = snapshot.data()
						emit()
					},
					(error) => onError(subscriptionMessage(error)),
				),
				onSnapshot(
					query(
						collection(firestore, 'rooms', roomId, 'players'),
						orderBy('seat'),
					),
					(snapshot) => {
						players = snapshot.docs.map((item) => ({
							id: item.id,
							data: item.data(),
						}))
						emit()
					},
					(error) => onError(subscriptionMessage(error)),
				),
				onSnapshot(
					query(
						collection(firestore, 'rooms', roomId, 'guesses'),
						orderBy('turnNumber'),
					),
					(snapshot) => {
						guesses = snapshot.docs.map((item) => ({
							id: item.id,
							data: item.data(),
						}))
						emit()
					},
					(error) => onError(subscriptionMessage(error)),
				),
			]
			if (cancelled) {
				subscriptions.forEach((unsubscribe) => unsubscribe())
				return
			}
			unsubscribers.push(...subscriptions)
		})
		.catch((error: unknown) => {
			if (!cancelled) {
				onError(mapOnlineGameError(error))
			}
		})

	return () => {
		cancelled = true
		unsubscribers.forEach((unsubscribe) => unsubscribe())
	}
}

const firebaseDependencies: OnlineGameDependencies = {
	ensureUser: ensureFirebaseUser,
	call: callFirebase,
	subscribeRoom: subscribeFirebaseRoom,
	getStoredRoomId: () =>
		typeof localStorage === 'undefined'
			? ''
			: localStorage.getItem('number-guessing-room-id') ?? '',
	setStoredRoomId: (roomId) => {
		localStorage.setItem('number-guessing-room-id', roomId)
	},
	clearStoredRoomId: () => {
		localStorage.removeItem('number-guessing-room-id')
	},
}

export const onlineGameService = createOnlineGameService(firebaseDependencies)

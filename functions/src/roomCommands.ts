import { randomInt } from 'node:crypto'
import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import {
	normalizeRoomId,
	validateDigitCount,
	validateGuess,
	validateMaxPlayers,
	validateName,
} from './domain.js'
import { CommandError } from './errors.js'
import {
	db,
	playerRef,
	roomRef,
	secretRef,
	type PlayerDocument,
	type RoomDocument,
	type SecretDocument,
} from './firestore.js'

const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function expiresAt(now: Timestamp): Timestamp {
	return Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000)
}

function randomRoomId(): string {
	return Array.from(
		{ length: 6 },
		() => roomAlphabet[randomInt(roomAlphabet.length)],
	).join('')
}

interface CommandOptions {
	firestore?: Firestore
	now?: () => Timestamp
	roomIdFactory?: () => string
}

export async function createRoom(
	uid: string,
	input: { name: unknown; digitCount: unknown; maxPlayers: unknown },
	options: CommandOptions = {},
): Promise<{ roomId: string }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const name = validateName(input.name)
	const digitCount = validateDigitCount(input.digitCount)
	const maxPlayers = validateMaxPlayers(input.maxPlayers)
	const makeRoomId = options.roomIdFactory ?? randomRoomId

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const roomId = normalizeRoomId(makeRoomId())
		const room = roomRef(firestore, roomId)
		const player = playerRef(firestore, roomId, uid)
		const created = await firestore.runTransaction(async (transaction) => {
			if ((await transaction.get(room)).exists) {
				return false
			}
			const roomData: RoomDocument = {
				hostUid: uid,
				phase: 'lobby',
				digitCount,
				maxPlayers,
				playerOrder: [uid],
				currentGuesserUid: null,
				winnerUid: null,
				turnNumber: 0,
				createdAt: now,
				updatedAt: now,
				expiresAt: expiresAt(now),
			}
			const playerData: PlayerDocument = {
				name,
				seat: 0,
				ready: false,
				eliminated: false,
				joinedAt: now,
			}
			transaction.create(room, roomData)
			transaction.create(player, playerData)
			return true
		})
		if (created) {
			return { roomId }
		}
	}
	throw new CommandError('aborted', 'ROOM_ID_COLLISION')
}

export async function joinRoom(
	uid: string,
	input: { roomId: unknown; name: unknown },
	options: CommandOptions = {},
): Promise<{ roomId: string }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	const name = validateName(input.name)
	const room = roomRef(firestore, roomId)
	const player = playerRef(firestore, roomId, uid)

	await firestore.runTransaction(async (transaction) => {
		const [roomSnapshot, playerSnapshot] = await Promise.all([
			transaction.get(room),
			transaction.get(player),
		])
		if (!roomSnapshot.exists) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const roomData = roomSnapshot.data() as RoomDocument
		if (roomData.expiresAt.toMillis() <= now.toMillis()) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		if (playerSnapshot.exists) {
			transaction.update(room, {
				updatedAt: now,
				expiresAt: expiresAt(now),
			})
			return
		}
		if (roomData.phase !== 'lobby') {
			throw new CommandError('failed-precondition', 'ROOM_ALREADY_STARTED')
		}
		if (roomData.playerOrder.length >= roomData.maxPlayers) {
			throw new CommandError('resource-exhausted', 'ROOM_FULL')
		}
		const playerData: PlayerDocument = {
			name,
			seat: roomData.playerOrder.length,
			ready: false,
			eliminated: false,
			joinedAt: now,
		}
		transaction.create(player, playerData)
		transaction.update(room, {
			playerOrder: [...roomData.playerOrder, uid],
			updatedAt: now,
			expiresAt: expiresAt(now),
		})
	})

	return { roomId }
}

function requireMember(room: RoomDocument, uid: string): void {
	if (!room.playerOrder.includes(uid)) {
		throw new CommandError('permission-denied', 'ROOM_MEMBERSHIP_REQUIRED')
	}
}

function requireHost(room: RoomDocument, uid: string): void {
	if (room.hostUid !== uid) {
		throw new CommandError('permission-denied', 'HOST_REQUIRED')
	}
}

export async function setSecret(
	uid: string,
	input: { roomId: unknown; number: unknown },
	options: CommandOptions = {},
): Promise<{ ready: true }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	const room = roomRef(firestore, roomId)
	const player = playerRef(firestore, roomId, uid)
	const secret = secretRef(firestore, roomId, uid)

	await firestore.runTransaction(async (transaction) => {
		const [roomSnapshot, playerSnapshot] = await Promise.all([
			transaction.get(room),
			transaction.get(player),
		])
		if (!roomSnapshot.exists || !playerSnapshot.exists) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const roomData = roomSnapshot.data() as RoomDocument
		requireMember(roomData, uid)
		if (roomData.phase !== 'lobby') {
			throw new CommandError('failed-precondition', 'ROOM_ALREADY_STARTED')
		}
		const number = validateGuess(input.number, roomData.digitCount)
		const secretData: SecretDocument = { number, updatedAt: now }
		transaction.set(secret, secretData)
		transaction.update(player, { ready: true })
		transaction.update(room, {
			updatedAt: now,
			expiresAt: expiresAt(now),
		})
	})

	return { ready: true }
}

export async function startRoom(
	uid: string,
	input: { roomId: unknown },
	options: CommandOptions = {},
): Promise<{ phase: 'guessing' }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	const room = roomRef(firestore, roomId)

	await firestore.runTransaction(async (transaction) => {
		const roomSnapshot = await transaction.get(room)
		if (!roomSnapshot.exists) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const roomData = roomSnapshot.data() as RoomDocument
		requireHost(roomData, uid)
		if (
			roomData.phase !== 'lobby' ||
			roomData.playerOrder.length !== roomData.maxPlayers
		) {
			throw new CommandError('failed-precondition', 'ROOM_NOT_READY')
		}
		const players = await Promise.all(
			roomData.playerOrder.map((playerUid) =>
				transaction.get(playerRef(firestore, roomId, playerUid)),
			),
		)
		if (
			players.some(
				(snapshot) =>
					!snapshot.exists || !(snapshot.data() as PlayerDocument).ready,
			)
		) {
			throw new CommandError('failed-precondition', 'ROOM_NOT_READY')
		}
		transaction.update(room, {
			phase: 'guessing',
			currentGuesserUid: roomData.playerOrder[0],
			turnNumber: 0,
			updatedAt: now,
			expiresAt: expiresAt(now),
		})
	})

	return { phase: 'guessing' }
}

export async function leaveRoom(
	uid: string,
	input: { roomId: unknown },
	options: CommandOptions = {},
): Promise<{ left: true }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	const room = roomRef(firestore, roomId)
	const leavingPlayer = playerRef(firestore, roomId, uid)
	const leavingSecret = secretRef(firestore, roomId, uid)

	const empty = await firestore.runTransaction(async (transaction) => {
		const roomSnapshot = await transaction.get(room)
		if (!roomSnapshot.exists) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const roomData = roomSnapshot.data() as RoomDocument
		requireMember(roomData, uid)
		if (roomData.phase === 'guessing') {
			throw new CommandError('failed-precondition', 'ACTIVE_MATCH_LEAVE_DENIED')
		}
		const remaining = roomData.playerOrder.filter((playerUid) => playerUid !== uid)
		const remainingPlayers = await Promise.all(
			remaining.map((playerUid) =>
				transaction.get(playerRef(firestore, roomId, playerUid)),
			),
		)
		transaction.delete(leavingPlayer)
		transaction.delete(leavingSecret)
		if (remaining.length === 0) {
			transaction.delete(room)
			return true
		}
		remainingPlayers.forEach((snapshot, seat) => {
			transaction.update(snapshot.ref, { seat })
		})
		transaction.update(room, {
			hostUid: roomData.hostUid === uid ? remaining[0] : roomData.hostUid,
			playerOrder: remaining,
			updatedAt: now,
			expiresAt: expiresAt(now),
		})
		return false
	})

	if (empty) {
		await firestore.recursiveDelete(room)
		await firestore.recursiveDelete(firestore.collection('roomSecrets').doc(roomId))
	}
	return { left: true }
}

export async function restartRoom(
	uid: string,
	input: { roomId: unknown },
	options: CommandOptions = {},
): Promise<{ phase: 'lobby' }> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	const room = roomRef(firestore, roomId)
	const initialSnapshot = await room.get()
	if (!initialSnapshot.exists) {
		throw new CommandError('not-found', 'ROOM_NOT_FOUND')
	}
	const initialRoom = initialSnapshot.data() as RoomDocument
	requireHost(initialRoom, uid)
	if (initialRoom.phase !== 'finished') {
		throw new CommandError('failed-precondition', 'ROOM_NOT_FINISHED')
	}

	await firestore.recursiveDelete(room.collection('guesses'))
	await firestore.recursiveDelete(firestore.collection('roomSecrets').doc(roomId))

	await firestore.runTransaction(async (transaction) => {
		const roomSnapshot = await transaction.get(room)
		if (!roomSnapshot.exists) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const roomData = roomSnapshot.data() as RoomDocument
		requireHost(roomData, uid)
		if (roomData.phase !== 'finished') {
			throw new CommandError('failed-precondition', 'ROOM_NOT_FINISHED')
		}
		const players = await Promise.all(
			roomData.playerOrder.map((playerUid) =>
				transaction.get(playerRef(firestore, roomId, playerUid)),
			),
		)
		players.forEach((snapshot) => {
			transaction.update(snapshot.ref, { ready: false, eliminated: false })
		})
		transaction.update(room, {
			phase: 'lobby',
			currentGuesserUid: null,
			winnerUid: null,
			turnNumber: 0,
			updatedAt: now,
			expiresAt: expiresAt(now),
		})
	})

	return { phase: 'lobby' }
}

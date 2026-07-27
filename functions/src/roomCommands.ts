import { randomInt } from 'node:crypto'
import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import {
	normalizeRoomId,
	validateDigitCount,
	validateMaxPlayers,
	validateName,
} from './domain.js'
import { CommandError } from './errors.js'
import {
	db,
	playerRef,
	roomRef,
	type PlayerDocument,
	type RoomDocument,
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

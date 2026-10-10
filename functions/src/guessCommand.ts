import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { normalizeRoomId, resolveGuess, validateGuess } from './domain.js'
import { CommandError } from './errors.js'
import {
	db,
	liveRoom,
	playerRef,
	roomRef,
	secretRef,
	type GuessDocument,
	type PlayerDocument,
	type RoomDocument,
	type SecretDocument,
} from './firestore.js'

interface GuessOptions {
	firestore?: Firestore
	now?: () => Timestamp
}

export async function submitGuess(
	uid: string,
	input: {
		roomId: unknown
		targetUid: unknown
		guess: unknown
		turnNumber: unknown
	},
	options: GuessOptions = {},
): Promise<{
	guessId: string
	correct: boolean
	correctDigits: number
	correctPositions: number
}> {
	const firestore = options.firestore ?? db
	const now = (options.now ?? Timestamp.now)()
	const roomId = normalizeRoomId(input.roomId)
	if (
		typeof input.targetUid !== 'string' ||
		input.targetUid.length === 0 ||
		typeof input.turnNumber !== 'number' ||
		!Number.isInteger(input.turnNumber)
	) {
		throw new CommandError('invalid-argument', 'GUESS_INPUT_INVALID')
	}
	const targetUid = input.targetUid
	const turnNumber = input.turnNumber
	const room = roomRef(firestore, roomId)
	const guessDocument = room.collection('guesses').doc()

	const result = await firestore.runTransaction(async (transaction) => {
		const roomData = liveRoom(await transaction.get(room), now)
		if (roomData.phase !== 'guessing') {
			throw new CommandError('failed-precondition', 'ROOM_NOT_GUESSING')
		}
		if (!roomData.playerOrder.includes(uid)) {
			throw new CommandError('permission-denied', 'ROOM_MEMBERSHIP_REQUIRED')
		}
		if (
			roomData.currentGuesserUid !== uid ||
			roomData.turnNumber !== turnNumber
		) {
			throw new CommandError('failed-precondition', 'TURN_STALE')
		}
		if (targetUid === uid || !roomData.playerOrder.includes(targetUid)) {
			throw new CommandError('failed-precondition', 'TARGET_INVALID')
		}
		const [playerSnapshots, secretSnapshot] = await Promise.all([
			Promise.all(
				roomData.playerOrder.map((playerUid) =>
					transaction.get(playerRef(firestore, roomId, playerUid)),
				),
			),
			transaction.get(secretRef(firestore, roomId, targetUid)),
		])
		if (playerSnapshots.some((snapshot) => !snapshot.exists)) {
			throw new CommandError('not-found', 'ROOM_NOT_FOUND')
		}
		const targetData = playerSnapshots[
			roomData.playerOrder.indexOf(targetUid)
		].data() as PlayerDocument
		if (targetData.eliminated) {
			throw new CommandError('failed-precondition', 'TARGET_ELIMINATED')
		}
		if (!secretSnapshot.exists) {
			throw new CommandError('failed-precondition', 'TARGET_INVALID')
		}
		const guess = validateGuess(input.guess, roomData.digitCount)
		const secret = secretSnapshot.data() as SecretDocument
		const eliminatedUids = playerSnapshots
			.filter((snapshot) => (snapshot.data() as PlayerDocument).eliminated)
			.map((snapshot) => snapshot.id)
		const resolution = resolveGuess({
			playerOrder: roomData.playerOrder,
			eliminatedUids,
			currentGuesserUid: uid,
			targetUid,
			guess,
			targetNumber: secret.number,
		})
		const nextTurnNumber = roomData.turnNumber + 1
		const guessData: GuessDocument = {
			turnNumber: nextTurnNumber,
			guesserUid: uid,
			targetUid,
			guess,
			correct: resolution.correct,
			correctDigits: resolution.correctDigits,
			correctPositions: resolution.correctPositions,
			// Rooms created before matches were numbered have no match field.
			match: roomData.match ?? 1,
			createdAt: now,
		}
		transaction.create(guessDocument, guessData)
		if (resolution.eliminatedUid) {
			transaction.update(playerRef(firestore, roomId, targetUid), {
				eliminated: true,
			})
		}
		transaction.update(room, {
			phase: resolution.winnerUid ? 'finished' : 'guessing',
			winnerUid: resolution.winnerUid,
			currentGuesserUid: resolution.nextGuesserUid,
			turnNumber: nextTurnNumber,
			turnStartedAt: now,
			updatedAt: now,
			expiresAt: Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000),
		})
		return resolution
	})

	return {
		guessId: guessDocument.id,
		correct: result.correct,
		correctDigits: result.correctDigits,
		correctPositions: result.correctPositions,
	}
}

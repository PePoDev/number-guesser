import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { submitGuess } from './guessCommand.js'

const projectId = 'demo-number-guessing'
const app = initializeApp({ projectId }, 'guess-command-tests')
const firestore = getFirestore(app)
const base = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))

async function clearFirestore(): Promise<void> {
	const host = process.env.FIRESTORE_EMULATOR_HOST
	if (!host) {
		throw new Error('FIRESTORE_EMULATOR_HOST is required')
	}
	await fetch(
		`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
		{ method: 'DELETE' },
	)
}

function time(seconds = 0): Timestamp {
	return Timestamp.fromMillis(base.toMillis() + seconds * 1000)
}

function at(seconds = 0) {
	return { firestore, now: () => time(seconds) }
}

async function seedStartedRoom(
	target: Firestore,
	input: {
		roomId: string
		playerOrder: string[]
		secrets: Record<string, string>
		eliminated?: string[]
		currentGuesserUid?: string
		match?: number
		expiresAt?: Timestamp
	},
): Promise<void> {
	const room = target.collection('rooms').doc(input.roomId)
	const batch = target.batch()
	batch.set(room, {
		hostUid: input.playerOrder[0],
		phase: 'guessing',
		digitCount: 3,
		maxPlayers: input.playerOrder.length,
		playerOrder: input.playerOrder,
		currentGuesserUid: input.currentGuesserUid ?? input.playerOrder[0],
		winnerUid: null,
		turnNumber: 0,
		turnStartedAt: base,
		match: input.match ?? 1,
		createdAt: base,
		updatedAt: base,
		expiresAt: input.expiresAt ?? Timestamp.fromMillis(base.toMillis() + 86_400_000),
	})
	input.playerOrder.forEach((uid, seat) => {
		batch.set(room.collection('players').doc(uid), {
			name: uid === 'host' ? 'Ada' : `Player ${seat + 1}`,
			seat,
			ready: true,
			eliminated: input.eliminated?.includes(uid) ?? false,
			left: false,
			joinedAt: base,
		})
		if (input.secrets[uid]) {
			batch.set(
				target
					.collection('roomSecrets')
					.doc(input.roomId)
					.collection('players')
					.doc(uid),
				{ number: input.secrets[uid], updatedAt: base },
			)
		}
	})
	await batch.commit()
}

async function roomData() {
	return (await firestore.collection('rooms').doc('AB2C3D').get()).data()
}

async function guess(
	uid: string,
	targetUid: string,
	value: string,
	turnNumber: number,
	seconds = 0,
) {
	return submitGuess(
		uid,
		{ roomId: 'AB2C3D', targetUid, guess: value, turnNumber },
		at(seconds),
	)
}

beforeEach(clearFirestore)
afterAll(() => deleteApp(app))

describe('submitGuess', () => {
	it('records feedback and rotates after an incorrect guess', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
			match: 3,
		})

		const result = await guess('host', 'p2', '451', 0, 45)

		expect(result).toMatchObject({
			correct: false,
			correctDigits: 2,
			correctPositions: 2,
		})
		expect(await roomData()).toMatchObject({
			currentGuesserUid: 'p2',
			turnNumber: 1,
			turnStartedAt: time(45),
		})
		const stored = await firestore
			.collection('rooms')
			.doc('AB2C3D')
			.collection('guesses')
			.doc(result.guessId)
			.get()
		expect(stored.data()).toMatchObject({
			turnNumber: 1,
			guesserUid: 'host',
			targetUid: 'p2',
			guess: '451',
			match: 3,
		})
	})

	it('eliminates a target and finishes with one active player', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await guess('host', 'p2', '456', 0)

		expect(await roomData()).toMatchObject({
			phase: 'finished',
			winnerUid: 'host',
			currentGuesserUid: null,
		})
	})

	it('rejects stale concurrent turns', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await guess('host', 'p2', '451', 0)

		await expect(guess('host', 'p2', '452', 0)).rejects.toMatchObject({
			code: 'failed-precondition',
			reason: 'TURN_STALE',
		})
	})

	it('rotates through a four-player room, skipping eliminated players', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2', 'p3', 'p4'],
			secrets: { host: '111', p2: '222', p3: '333', p4: '444' },
			eliminated: ['p3'],
			currentGuesserUid: 'p2',
		})

		await guess('p2', 'p4', '123', 0)
		expect(await roomData()).toMatchObject({ currentGuesserUid: 'p4', turnNumber: 1 })

		await guess('p4', 'host', '123', 1)
		expect(await roomData()).toMatchObject({ currentGuesserUid: 'host', turnNumber: 2 })

		await guess('host', 'p2', '222', 2, 10)
		expect(await roomData()).toMatchObject({
			phase: 'guessing',
			currentGuesserUid: 'host',
			turnNumber: 3,
			turnStartedAt: time(10),
		})

		await guess('host', 'p4', '444', 3)
		expect(await roomData()).toMatchObject({
			phase: 'finished',
			winnerUid: 'host',
			currentGuesserUid: null,
		})
	})

	it('passes the turn past a player eliminated in a three-player room', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2', 'p3'],
			secrets: { host: '111', p2: '222', p3: '333' },
		})

		await guess('host', 'p2', '222', 0)
		await guess('host', 'p3', '123', 1)

		expect(await roomData()).toMatchObject({
			phase: 'guessing',
			currentGuesserUid: 'p3',
			turnNumber: 2,
		})
	})

	it('rejects a guess from a nonmember', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await expect(guess('stranger', 'p2', '456', 0)).rejects.toMatchObject({
			code: 'permission-denied',
			reason: 'ROOM_MEMBERSHIP_REQUIRED',
		})
	})

	it('rejects guessing yourself or a player outside the room', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await expect(guess('host', 'host', '123', 0)).rejects.toMatchObject({
			code: 'failed-precondition',
			reason: 'TARGET_INVALID',
		})
		await expect(guess('host', 'stranger', '123', 0)).rejects.toMatchObject({
			code: 'failed-precondition',
			reason: 'TARGET_INVALID',
		})
	})

	it('rejects guessing an eliminated target, including one who left', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2', 'p3'],
			secrets: { host: '111', p3: '333' },
			eliminated: ['p2'],
		})

		await expect(guess('host', 'p2', '222', 0)).rejects.toMatchObject({
			code: 'failed-precondition',
			reason: 'TARGET_ELIMINATED',
		})
	})

	it('rejects a guess with the wrong digit count', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await expect(guess('host', 'p2', '4567', 0)).rejects.toMatchObject({
			code: 'GUESS_INVALID',
		})
		expect(await roomData()).toMatchObject({ currentGuesserUid: 'host', turnNumber: 0 })
	})

	it('reports a room with a missing player document as not found', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2', 'p3'],
			secrets: { host: '111', p2: '222', p3: '333' },
		})
		const players = firestore.collection('rooms').doc('AB2C3D').collection('players')
		await players.doc('p2').delete()

		await expect(guess('host', 'p2', '222', 0)).rejects.toMatchObject({
			code: 'not-found',
			reason: 'ROOM_NOT_FOUND',
		})
		await expect(guess('host', 'p3', '333', 0)).rejects.toMatchObject({
			code: 'not-found',
			reason: 'ROOM_NOT_FOUND',
		})
	})

	it('treats an expired room as missing', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
			expiresAt: base,
		})

		await expect(guess('host', 'p2', '456', 0)).rejects.toMatchObject({
			code: 'not-found',
			reason: 'ROOM_NOT_FOUND',
		})
	})
})

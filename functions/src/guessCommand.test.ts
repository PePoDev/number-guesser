import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { submitGuess } from './guessCommand.js'

const projectId = 'demo-number-guessing'
const app = initializeApp({ projectId }, 'guess-command-tests')
const firestore = getFirestore(app)

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

async function seedStartedRoom(
	target: Firestore,
	input: {
		roomId: string
		playerOrder: string[]
		secrets: Record<string, string>
	},
): Promise<void> {
	const now = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))
	const room = target.collection('rooms').doc(input.roomId)
	const batch = target.batch()
	batch.set(room, {
		hostUid: input.playerOrder[0],
		phase: 'guessing',
		digitCount: 3,
		maxPlayers: input.playerOrder.length,
		playerOrder: input.playerOrder,
		currentGuesserUid: input.playerOrder[0],
		winnerUid: null,
		turnNumber: 0,
		createdAt: now,
		updatedAt: now,
		expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
	})
	input.playerOrder.forEach((uid, seat) => {
		batch.set(room.collection('players').doc(uid), {
			name: uid === 'host' ? 'Ada' : `Player ${seat + 1}`,
			seat,
			ready: true,
			eliminated: false,
			joinedAt: now,
		})
		batch.set(
			target
				.collection('roomSecrets')
				.doc(input.roomId)
				.collection('players')
				.doc(uid),
			{ number: input.secrets[uid], updatedAt: now },
		)
	})
	await batch.commit()
}

beforeEach(clearFirestore)
afterAll(() => deleteApp(app))

describe('submitGuess', () => {
	it('records feedback and rotates after an incorrect guess', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		const result = await submitGuess(
			'host',
			{ roomId: 'AB2C3D', targetUid: 'p2', guess: '451', turnNumber: 0 },
			{ firestore },
		)

		expect(result).toMatchObject({
			correct: false,
			correctDigits: 2,
			correctPositions: 2,
		})
		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
			currentGuesserUid: 'p2',
			turnNumber: 1,
		})
	})

	it('eliminates a target and finishes with one active player', async () => {
		await seedStartedRoom(firestore, {
			roomId: 'AB2C3D',
			playerOrder: ['host', 'p2'],
			secrets: { host: '123', p2: '456' },
		})

		await submitGuess(
			'host',
			{ roomId: 'AB2C3D', targetUid: 'p2', guess: '456', turnNumber: 0 },
			{ firestore },
		)

		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
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

		await submitGuess(
			'host',
			{ roomId: 'AB2C3D', targetUid: 'p2', guess: '451', turnNumber: 0 },
			{ firestore },
		)

		await expect(
			submitGuess(
				'host',
				{ roomId: 'AB2C3D', targetUid: 'p2', guess: '452', turnNumber: 0 },
				{ firestore },
			),
		).rejects.toMatchObject({ code: 'failed-precondition' })
	})
})

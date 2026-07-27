import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
	createRoom,
	joinRoom,
	leaveRoom,
	restartRoom,
	setSecret,
	startRoom,
} from './roomCommands.js'

const projectId = 'demo-number-guessing'
const app = initializeApp({ projectId }, 'room-command-tests')
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

async function seedFinishedRoom(
	target: Firestore,
	roomId: string,
): Promise<void> {
	const now = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))
	const room = target.collection('rooms').doc(roomId)
	const batch = target.batch()
	batch.set(room, {
		hostUid: 'host',
		phase: 'finished',
		digitCount: 3,
		maxPlayers: 2,
		playerOrder: ['host', 'p2'],
		currentGuesserUid: null,
		winnerUid: 'host',
		turnNumber: 1,
		createdAt: now,
		updatedAt: now,
		expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
	})
	batch.set(room.collection('players').doc('host'), {
		name: 'Ada',
		seat: 0,
		ready: true,
		eliminated: false,
		joinedAt: now,
	})
	batch.set(room.collection('players').doc('p2'), {
		name: 'Lin',
		seat: 1,
		ready: true,
		eliminated: true,
		joinedAt: now,
	})
	batch.set(room.collection('guesses').doc('guess-1'), {
		turnNumber: 1,
		guesserUid: 'host',
		targetUid: 'p2',
		guess: '456',
		correct: true,
		correctDigits: 3,
		correctPositions: 3,
		createdAt: now,
	})
	batch.set(
		target.collection('roomSecrets').doc(roomId).collection('players').doc('host'),
		{ number: '123', updatedAt: now },
	)
	batch.set(
		target.collection('roomSecrets').doc(roomId).collection('players').doc('p2'),
		{ number: '456', updatedAt: now },
	)
	await batch.commit()
}

beforeEach(clearFirestore)
afterAll(() => deleteApp(app))

describe('room commands', () => {
	it('creates a six-character room with the host as seat zero', async () => {
		const result = await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 3 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)

		expect(result).toEqual({ roomId: 'AB2C3D' })
		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
			hostUid: 'host',
			phase: 'lobby',
			digitCount: 3,
			maxPlayers: 3,
			playerOrder: ['host'],
		})
	})

	it('joins an existing lobby and is idempotent for the same uid', async () => {
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)
		await joinRoom('p2', { roomId: 'ab2c3d', name: 'Lin' }, { firestore })
		await joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore })

		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()?.playerOrder).toEqual(['host', 'p2'])
	})

	it('rejects joining a full room', async () => {
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)
		await joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore })

		await expect(
			joinRoom('p3', { roomId: 'AB2C3D', name: 'Sam' }, { firestore }),
		).rejects.toMatchObject({ code: 'resource-exhausted' })
	})

	it(
		'admits only one player when the final seat is contested',
		async () => {
			await createRoom(
				'host',
				{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
				{ firestore, roomIdFactory: () => 'AB2C3D' },
			)

			const results = await Promise.allSettled([
				joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore }),
				joinRoom('p3', { roomId: 'AB2C3D', name: 'Grace' }, { firestore }),
			])

			expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
			const room = await firestore.collection('rooms').doc('AB2C3D').get()
			expect(room.data()?.playerOrder).toHaveLength(2)
		},
		15_000,
	)

	it('treats an expired room as missing', async () => {
		const createdAt = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{
				firestore,
				roomIdFactory: () => 'AB2C3D',
				now: () => createdAt,
			},
		)

		await expect(
			joinRoom(
				'p2',
				{ roomId: 'AB2C3D', name: 'Lin' },
				{
					firestore,
					now: () => Timestamp.fromMillis(createdAt.toMillis() + 86_400_001),
				},
			),
		).rejects.toMatchObject({ code: 'not-found' })
	})

	it('stores a secret privately and starts only when the room is full and ready', async () => {
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)
		await joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore })
		await setSecret('host', { roomId: 'AB2C3D', number: '123' }, { firestore })
		await expect(startRoom('host', { roomId: 'AB2C3D' }, { firestore }))
			.rejects.toMatchObject({ code: 'failed-precondition' })
		await setSecret('p2', { roomId: 'AB2C3D', number: '456' }, { firestore })
		await startRoom('host', { roomId: 'AB2C3D' }, { firestore })

		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
			phase: 'guessing',
			currentGuesserUid: 'host',
		})
		const publicHost = await room.ref.collection('players').doc('host').get()
		expect(publicHost.data()).not.toHaveProperty('number')
	})

	it('transfers host ownership when the host leaves the lobby', async () => {
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)
		await joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore })
		await leaveRoom('host', { roomId: 'AB2C3D' }, { firestore })

		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
			hostUid: 'p2',
			playerOrder: ['p2'],
		})
	})

	it('rejects voluntary leave during an active match', async () => {
		await createRoom(
			'host',
			{ name: 'Ada', digitCount: 3, maxPlayers: 2 },
			{ firestore, roomIdFactory: () => 'AB2C3D' },
		)
		await joinRoom('p2', { roomId: 'AB2C3D', name: 'Lin' }, { firestore })
		await setSecret('host', { roomId: 'AB2C3D', number: '123' }, { firestore })
		await setSecret('p2', { roomId: 'AB2C3D', number: '456' }, { firestore })
		await startRoom('host', { roomId: 'AB2C3D' }, { firestore })

		await expect(
			leaveRoom('p2', { roomId: 'AB2C3D' }, { firestore }),
		).rejects.toMatchObject({ code: 'failed-precondition' })
	})

	it('restarts a finished room without retaining secrets or guesses', async () => {
		await seedFinishedRoom(firestore, 'AB2C3D')
		await restartRoom('host', { roomId: 'AB2C3D' }, { firestore })

		const room = await firestore.collection('rooms').doc('AB2C3D').get()
		expect(room.data()).toMatchObject({
			phase: 'lobby',
			currentGuesserUid: null,
			winnerUid: null,
			turnNumber: 0,
		})
		expect((await room.ref.collection('guesses').get()).empty).toBe(true)
		expect(
			(
				await firestore
					.collection('roomSecrets')
					.doc('AB2C3D')
					.collection('players')
					.get()
			).empty,
		).toBe(true)
		const players = await room.ref.collection('players').get()
		expect(players.docs.every((player) => player.data().ready === false)).toBe(true)
		expect(players.docs.every((player) => player.data().eliminated === false)).toBe(true)
	})
})

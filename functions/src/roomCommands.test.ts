import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createRoom, joinRoom } from './roomCommands.js'

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
})

import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { afterAll, beforeEach, expect, it } from 'vitest'
import { cleanupExpiredRooms } from './cleanup.js'

const projectId = 'demo-number-guessing'
const app = initializeApp({ projectId }, 'cleanup-tests')
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

it('recursively deletes only expired public and private room data', async () => {
	const now = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))
	const batch = firestore.batch()
	for (const [roomId, expiresAt] of [
		['EXPIRED', Timestamp.fromMillis(now.toMillis() - 1)],
		['FRESH1', Timestamp.fromMillis(now.toMillis() + 86_400_000)],
	] as const) {
		const room = firestore.collection('rooms').doc(roomId)
		batch.set(room, { expiresAt })
		batch.set(room.collection('players').doc('host'), { name: 'Ada' })
		batch.set(
			firestore
				.collection('roomSecrets')
				.doc(roomId)
				.collection('players')
				.doc('host'),
			{ number: '123' },
		)
	}
	await batch.commit()

	const deleted = await cleanupExpiredRooms(firestore, now)

	expect(deleted).toEqual(['EXPIRED'])
	expect((await firestore.collection('rooms').doc('EXPIRED').get()).exists).toBe(false)
	expect((await firestore.collection('rooms').doc('FRESH1').get()).exists).toBe(true)
	expect(
		(
			await firestore
				.collection('roomSecrets')
				.doc('EXPIRED')
				.collection('players')
				.doc('host')
				.get()
		).exists,
	).toBe(false)
})

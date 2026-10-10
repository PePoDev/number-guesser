import { deleteApp, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanupExpiredRooms } from './cleanup.js'

const projectId = 'demo-number-guessing'
const app = initializeApp({ projectId }, 'cleanup-tests')
const firestore = getFirestore(app)
const now = Timestamp.fromDate(new Date('2026-07-27T00:00:00Z'))
const expired = Timestamp.fromMillis(now.toMillis() - 1)
const fresh = Timestamp.fromMillis(now.toMillis() + 86_400_000)

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

function secretDoc(roomId: string) {
	return firestore.collection('roomSecrets').doc(roomId).collection('players').doc('host')
}

async function seedRooms(rooms: Record<string, Timestamp>): Promise<void> {
	const batch = firestore.batch()
	for (const [roomId, expiresAt] of Object.entries(rooms)) {
		const room = firestore.collection('rooms').doc(roomId)
		batch.set(room, { expiresAt })
		batch.set(room.collection('players').doc('host'), { name: 'Ada' })
		batch.set(secretDoc(roomId), { number: '123' })
	}
	await batch.commit()
}

async function roomExists(roomId: string): Promise<boolean> {
	return (await firestore.collection('rooms').doc(roomId).get()).exists
}

beforeEach(clearFirestore)
afterEach(() => {
	vi.restoreAllMocks()
})
afterAll(() => deleteApp(app))

it('recursively deletes only expired public and private room data', async () => {
	await seedRooms({ EXPIRED: expired, FRESH1: fresh })

	const deleted = await cleanupExpiredRooms(firestore, now)

	expect(deleted).toEqual(['EXPIRED'])
	expect(await roomExists('EXPIRED')).toBe(false)
	expect(await roomExists('FRESH1')).toBe(true)
	expect(
		(await firestore.collection('rooms').doc('EXPIRED').collection('players').get()).empty,
	).toBe(true)
	expect((await secretDoc('EXPIRED').get()).exists).toBe(false)
	expect((await secretDoc('FRESH1').get()).exists).toBe(true)
})

it('pages through more expired rooms than one query returns', async () => {
	await seedRooms({
		ROOM1A: expired,
		ROOM2A: Timestamp.fromMillis(now.toMillis() - 2),
		ROOM3A: Timestamp.fromMillis(now.toMillis() - 3),
		ROOM4A: now,
		ROOM5A: expired,
		FRESH1: fresh,
	})

	const deleted = await cleanupExpiredRooms(firestore, now, 2)

	expect([...deleted].sort()).toEqual(['ROOM1A', 'ROOM2A', 'ROOM3A', 'ROOM4A', 'ROOM5A'])
	expect((await firestore.collection('rooms').get()).docs.map((room) => room.id)).toEqual([
		'FRESH1',
	])
})

it('skips a room whose expiry was refreshed after the query', async () => {
	await seedRooms({ REVIVE: expired })
	const runTransaction = firestore.runTransaction.bind(firestore)
	vi.spyOn(firestore, 'runTransaction').mockImplementationOnce(
		(async (update, options) => {
			await firestore.collection('rooms').doc('REVIVE').update({ expiresAt: fresh })
			return runTransaction(update, options)
		}) as typeof runTransaction,
	)

	const deleted = await cleanupExpiredRooms(firestore, now)

	expect(deleted).toEqual([])
	expect(await roomExists('REVIVE')).toBe(true)
	expect((await secretDoc('REVIVE').get()).exists).toBe(true)
})

it('deletes secrets before the room so an interrupted run can finish later', async () => {
	await seedRooms({ EXPIRED: expired })
	const recursiveDelete = firestore.recursiveDelete.bind(firestore)
	vi.spyOn(firestore, 'recursiveDelete').mockImplementation(async (ref, bulkWriter) => {
		if (ref.path.startsWith('rooms/')) {
			throw new Error('interrupted')
		}
		return recursiveDelete(ref, bulkWriter)
	})

	await expect(cleanupExpiredRooms(firestore, now)).rejects.toThrow('interrupted')
	expect((await secretDoc('EXPIRED').get()).exists).toBe(false)
	expect(await roomExists('EXPIRED')).toBe(true)

	vi.restoreAllMocks()
	expect(await cleanupExpiredRooms(firestore, now)).toEqual(['EXPIRED'])
	expect(await roomExists('EXPIRED')).toBe(false)
})

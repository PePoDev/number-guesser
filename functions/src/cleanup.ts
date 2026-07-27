import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { db } from './firestore.js'

export async function cleanupExpiredRooms(
	firestore: Firestore = db,
	now: Timestamp = Timestamp.now(),
): Promise<string[]> {
	const expired = await firestore
		.collection('rooms')
		.where('expiresAt', '<=', now)
		.get()

	await Promise.all(
		expired.docs.map(async (room) => {
			await firestore.recursiveDelete(room.ref)
			await firestore.recursiveDelete(
				firestore.collection('roomSecrets').doc(room.id),
			)
		}),
	)

	return expired.docs.map((room) => room.id)
}

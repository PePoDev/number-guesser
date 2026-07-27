import { getApps, initializeApp } from 'firebase-admin/app'
import {
	FieldValue,
	Timestamp,
	getFirestore,
	type Firestore,
} from 'firebase-admin/firestore'

if (getApps().length === 0) {
	initializeApp()
}

export const db = getFirestore()
export { FieldValue, Timestamp }

export type RoomPhase = 'lobby' | 'guessing' | 'finished'

export interface RoomDocument {
	hostUid: string
	phase: RoomPhase
	digitCount: number
	maxPlayers: number
	playerOrder: string[]
	currentGuesserUid: string | null
	winnerUid: string | null
	turnNumber: number
	createdAt: Timestamp
	updatedAt: Timestamp
	expiresAt: Timestamp
}

export interface PlayerDocument {
	name: string
	seat: number
	ready: boolean
	eliminated: boolean
	joinedAt: Timestamp
}

export interface GuessDocument {
	turnNumber: number
	guesserUid: string
	targetUid: string
	guess: string
	correct: boolean
	correctDigits: number
	correctPositions: number
	createdAt: Timestamp
}

export interface SecretDocument {
	number: string
	updatedAt: Timestamp
}

export function roomRef(firestore: Firestore, roomId: string) {
	return firestore.collection('rooms').doc(roomId)
}

export function playerRef(firestore: Firestore, roomId: string, uid: string) {
	return roomRef(firestore, roomId).collection('players').doc(uid)
}

export function secretRef(firestore: Firestore, roomId: string, uid: string) {
	return firestore.collection('roomSecrets').doc(roomId).collection('players').doc(uid)
}

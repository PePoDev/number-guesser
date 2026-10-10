import { readFileSync } from 'node:fs'
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
	collection,
	collectionGroup,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	setDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let environment: RulesTestEnvironment

beforeAll(async () => {
	environment = await initializeTestEnvironment({
		projectId: 'demo-number-guessing',
		firestore: {
			rules: readFileSync('firestore.rules', 'utf8'),
			host: '127.0.0.1',
			port: 8080,
		},
	})
})

beforeEach(async () => {
	await environment.clearFirestore()
	await environment.withSecurityRulesDisabled(async (context) => {
		const firestore = context.firestore()
		await setDoc(doc(firestore, 'rooms/AB2C3D'), { phase: 'lobby' })
		await setDoc(doc(firestore, 'rooms/AB2C3D/players/member'), {
			name: 'Ada',
			seat: 0,
		})
		await setDoc(doc(firestore, 'rooms/AB2C3D/players/rival'), {
			name: 'Sam',
			seat: 1,
		})
		await setDoc(doc(firestore, 'rooms/AB2C3D/guesses/g1'), {
			turnNumber: 1,
			guesserUid: 'member',
			targetUid: 'rival',
			guess: '456',
			match: 1,
		})
		await setDoc(doc(firestore, 'roomSecrets/AB2C3D/players/member'), {
			number: '123',
		})
		await setDoc(doc(firestore, 'roomSecrets/AB2C3D/players/rival'), {
			number: '456',
		})
		await setDoc(doc(firestore, 'rooms/ZX2C3D'), { phase: 'lobby' })
		await setDoc(doc(firestore, 'rooms/ZX2C3D/players/other'), { name: 'Lin' })
		await setDoc(doc(firestore, 'rooms/ZX2C3D/guesses/g1'), { turnNumber: 1 })
		await setDoc(doc(firestore, 'rateLimits/member'), { roomCreatedAt: [] })
	})
})

afterAll(async () => {
	await environment.cleanup()
})

describe('firestore rules', () => {
	it('allows members to read public room state', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertSucceeds(getDoc(doc(firestore, 'rooms/AB2C3D')))
	})

	it('allows members to list players in their room', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		const players = await assertSucceeds(
			getDocs(
				query(
					collection(firestore, 'rooms/AB2C3D/players'),
					orderBy('seat'),
				),
			),
		)

		expect(players.docs.map((player) => player.id)).toEqual(['member', 'rival'])
	})

	it('allows members to read guesses in their room only', async () => {
		const member = environment.authenticatedContext('member').firestore()
		const stranger = environment.authenticatedContext('stranger').firestore()

		const guesses = await assertSucceeds(
			getDocs(query(collection(member, 'rooms/AB2C3D/guesses'), orderBy('turnNumber'))),
		)
		expect(guesses.docs.map((guess) => guess.id)).toEqual(['g1'])
		await assertFails(getDocs(collection(member, 'rooms/ZX2C3D/guesses')))
		await assertFails(getDocs(collection(stranger, 'rooms/AB2C3D/guesses')))
		await assertFails(getDoc(doc(stranger, 'rooms/AB2C3D/guesses/g1')))
	})

	it('revokes access for a player removed from the lobby', async () => {
		const rival = environment.authenticatedContext('rival').firestore()
		await assertSucceeds(getDoc(doc(rival, 'rooms/AB2C3D')))

		await environment.withSecurityRulesDisabled(async (context) => {
			await deleteDoc(doc(context.firestore(), 'rooms/AB2C3D/players/rival'))
		})

		await assertFails(getDoc(doc(rival, 'rooms/AB2C3D')))
		await assertFails(getDocs(collection(rival, 'rooms/AB2C3D/players')))
		await assertFails(getDocs(collection(rival, 'rooms/AB2C3D/guesses')))
	})

	it('denies nonmembers and anonymous users', async () => {
		const stranger = environment.authenticatedContext('stranger').firestore()
		const anonymous = environment.unauthenticatedContext().firestore()
		await assertFails(getDoc(doc(stranger, 'rooms/AB2C3D')))
		await assertFails(getDoc(doc(anonymous, 'rooms/AB2C3D')))
	})

	it('denies a member access to another room', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(getDoc(doc(firestore, 'rooms/ZX2C3D')))
		await assertFails(getDoc(doc(firestore, 'rooms/ZX2C3D/players/other')))
	})

	it('denies all direct public writes', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(setDoc(doc(firestore, 'rooms/AB2C3D'), { phase: 'finished' }))
	})

	it('denies every secret read', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(
			getDoc(doc(firestore, 'roomSecrets/AB2C3D/players/member')),
		)
	})

	it("denies reading another member's secret", async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(getDoc(doc(firestore, 'roomSecrets/AB2C3D/players/rival')))
	})

	it('denies listing room secrets', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(getDocs(collection(firestore, 'roomSecrets/AB2C3D/players')))
	})

	it('denies collection-group queries across rooms', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(getDocs(collectionGroup(firestore, 'players')))
		await assertFails(getDocs(collectionGroup(firestore, 'guesses')))
	})

	it('denies all client access to rate limits', async () => {
		const firestore = environment.authenticatedContext('member').firestore()
		await assertFails(getDoc(doc(firestore, 'rateLimits/member')))
		await assertFails(setDoc(doc(firestore, 'rateLimits/member'), { roomCreatedAt: [] }))
	})
})

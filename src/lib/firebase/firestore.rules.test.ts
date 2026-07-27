import { readFileSync } from 'node:fs'
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

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
		await setDoc(doc(firestore, 'rooms/AB2C3D/players/member'), { name: 'Ada' })
		await setDoc(doc(firestore, 'roomSecrets/AB2C3D/players/member'), {
			number: '123',
		})
		await setDoc(doc(firestore, 'rooms/ZX2C3D'), { phase: 'lobby' })
		await setDoc(doc(firestore, 'rooms/ZX2C3D/players/other'), { name: 'Lin' })
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
})

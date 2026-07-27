import { describe, expect, it } from 'vitest'
import { DomainError } from './domain.js'
import { CommandError, requireUid, toHttpsError } from './errors.js'

describe('callable errors', () => {
	it('requires an authenticated uid', () => {
		expect(requireUid({ uid: 'player' })).toBe('player')
		expect(() => requireUid(undefined)).toThrow(
			expect.objectContaining({
				code: 'unauthenticated',
				reason: 'AUTH_REQUIRED',
			}),
		)
	})

	it('maps command and domain errors to stable HTTPS errors', () => {
		expect(toHttpsError(new CommandError('not-found', 'ROOM_NOT_FOUND'))).toMatchObject({
			code: 'not-found',
			message: 'ROOM_NOT_FOUND',
		})
		expect(toHttpsError(new DomainError('NAME_INVALID'))).toMatchObject({
			code: 'invalid-argument',
			message: 'NAME_INVALID',
		})
	})

	it('hides unexpected server errors', () => {
		expect(toHttpsError(new Error('private detail'))).toMatchObject({
			code: 'internal',
			message: 'ONLINE_GAME_INTERNAL',
		})
	})
})

import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https'
import { DomainError } from './domain.js'

export class CommandError extends Error {
	constructor(
		public readonly code: FunctionsErrorCode,
		public readonly reason: string,
	) {
		super(reason)
	}
}

export function toHttpsError(error: unknown): HttpsError {
	if (error instanceof CommandError) {
		return new HttpsError(error.code, error.reason)
	}
	if (error instanceof DomainError) {
		return new HttpsError('invalid-argument', error.code)
	}
	return new HttpsError('internal', 'ONLINE_GAME_INTERNAL')
}

export function requireUid(auth: { uid: string } | undefined): string {
	if (!auth?.uid) {
		throw new CommandError('unauthenticated', 'AUTH_REQUIRED')
	}
	return auth.uid
}

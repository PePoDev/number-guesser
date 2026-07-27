import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import OnlineMultiplayerGame from './OnlineMultiplayerGame.svelte'
import { gameStore } from '$lib/stores/gameStore'
import type { OnlineSnapshot } from '$lib/online/types'
import type { OnlineGameService } from '$lib/services/onlineGameService'

function createFakeOnlineGameService(input?: {
	createRoomResult?: { uid: string; roomId: string }
	joinRoomResult?: { uid: string; roomId: string }
	restoreSessionResult?: { uid: string; roomId: string } | null
}): OnlineGameService {
	return {
		restoreSession: vi.fn(async () => input?.restoreSessionResult ?? null),
		createRoom: vi.fn(async () =>
			input?.createRoomResult ?? { uid: 'host', roomId: 'AB2C3D' },
		),
		joinRoom: vi.fn(async () =>
			input?.joinRoomResult ?? { uid: 'p2', roomId: 'AB2C3D' },
		),
		setSecret: vi.fn(async () => undefined),
		startRoom: vi.fn(async () => undefined),
		submitGuess: vi.fn(async () => undefined),
		leaveRoom: vi.fn(async () => undefined),
		restartRoom: vi.fn(async () => undefined),
		clearSession: vi.fn(),
		subscribeToRoom: vi.fn(() => vi.fn()),
	}
}

function readyLobbySnapshot(hostReady = true): OnlineSnapshot {
	return {
		room: {
			id: 'AB2C3D',
			hostUid: 'host',
			phase: 'lobby',
			digitCount: 3,
			maxPlayers: 2,
			playerOrder: ['host', 'p2'],
			currentGuesserUid: null,
			winnerUid: null,
			turnNumber: 0,
		},
		players: [
			{
				uid: 'host',
				name: 'Ada',
				seat: 0,
				ready: hostReady,
				eliminated: false,
			},
			{
				uid: 'p2',
				name: 'Lin',
				seat: 1,
				ready: true,
				eliminated: false,
			},
		],
		guesses: [],
	}
}

beforeEach(() => {
	gameStore.reset()
	gameStore.setMode('online')
	gameStore.updateSettings({ digitCount: 3, playerCount: 2 })
})

it('creates a room from the entered name', async () => {
	const service = createFakeOnlineGameService({
		createRoomResult: { uid: 'host', roomId: 'AB2C3D' },
	})
	const user = userEvent.setup()
	render(OnlineMultiplayerGame, { props: { service } })

	await user.type(screen.getByLabelText('Display name'), 'Ada')
	await user.click(screen.getByRole('button', { name: 'Create Room' }))

	expect(service.createRoom).toHaveBeenCalledWith({
		name: 'Ada',
		digitCount: 3,
		maxPlayers: 2,
	})
})

it('normalizes and joins a room', async () => {
	const service = createFakeOnlineGameService({
		joinRoomResult: { uid: 'p2', roomId: 'AB2C3D' },
	})
	const user = userEvent.setup()
	render(OnlineMultiplayerGame, { props: { service } })

	await user.type(screen.getByLabelText('Display name'), 'Lin')
	await user.type(screen.getByLabelText('Room ID'), 'ab2c3d')
	await user.click(screen.getByRole('button', { name: 'Join Room' }))

	expect(service.joinRoom).toHaveBeenCalledWith({
		name: 'Lin',
		roomId: 'AB2C3D',
	})
})

it('shows lobby readiness and lets the host start', async () => {
	const service = createFakeOnlineGameService()
	gameStore.setOnlineIdentity('host', 'AB2C3D')
	gameStore.applyOnlineSnapshot(readyLobbySnapshot(false))
	const user = userEvent.setup()
	render(OnlineMultiplayerGame, { props: { service } })

	expect(
		screen.getByRole('heading', { name: 'Room AB2C3D' }),
	).toBeInTheDocument()
	expect(screen.getByText('2 / 2 players')).toBeInTheDocument()
	await user.type(screen.getByLabelText('Secret number'), '123')
	await user.click(screen.getByRole('button', { name: 'Ready' }))
	gameStore.applyOnlineSnapshot(readyLobbySnapshot())
	await user.click(screen.getByRole('button', { name: 'Start Game' }))

	expect(service.setSecret).toHaveBeenCalledWith({
		roomId: 'AB2C3D',
		number: '123',
	})
	expect(service.startRoom).toHaveBeenCalledWith('AB2C3D')
})

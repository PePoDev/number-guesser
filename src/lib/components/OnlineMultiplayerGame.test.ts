import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { tick } from 'svelte'
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

function guessingSnapshot(input: {
	currentGuesserUid: string
	turnNumber?: number
}): OnlineSnapshot {
	return {
		room: {
			id: 'AB2C3D',
			hostUid: 'host',
			phase: 'guessing',
			digitCount: 3,
			maxPlayers: 2,
			playerOrder: ['host', 'p2'],
			currentGuesserUid: input.currentGuesserUid,
			winnerUid: null,
			turnNumber: input.turnNumber ?? 0,
		},
		players: [
			{
				uid: 'host',
				name: 'Ada',
				seat: 0,
				ready: true,
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

function finishedSnapshot(input: { winnerUid: string }): OnlineSnapshot {
	const snapshot = guessingSnapshot({
		currentGuesserUid: input.winnerUid,
		turnNumber: 1,
	})
	return {
		...snapshot,
		room: {
			...snapshot.room,
			phase: 'finished',
			currentGuesserUid: null,
			winnerUid: input.winnerUid,
		},
		players: snapshot.players.map((player) => ({
			...player,
			eliminated: player.uid !== input.winnerUid,
		})),
		guesses: [
			{
				id: 'turn-1',
				turnNumber: 1,
				guesserUid: input.winnerUid,
				targetUid: input.winnerUid === 'host' ? 'p2' : 'host',
				guess: '456',
				correct: true,
				correctDigits: 3,
				correctPositions: 3,
			},
		],
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

it('pre-fills an invited room without restoring another session', () => {
	const service = createFakeOnlineGameService({
		restoreSessionResult: { uid: 'old-player', roomId: 'ZZZZZZ' },
	})

	render(OnlineMultiplayerGame, {
		props: { service, initialRoomId: 'AB2C3D' },
	})

	expect(screen.getByLabelText('Room ID')).toHaveValue('AB2C3D')
	expect(service.restoreSession).not.toHaveBeenCalled()
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

it('keeps one room subscription while snapshots update', async () => {
	const service = createFakeOnlineGameService()
	gameStore.setOnlineIdentity('host', 'AB2C3D')
	gameStore.applyOnlineSnapshot(readyLobbySnapshot(false))
	render(OnlineMultiplayerGame, { props: { service } })

	await waitFor(() => {
		expect(service.subscribeToRoom).toHaveBeenCalledTimes(1)
	})
	gameStore.applyOnlineSnapshot(readyLobbySnapshot())
	await tick()

	expect(service.subscribeToRoom).toHaveBeenCalledTimes(1)
})

it('submits a guess with Enter for the active player', async () => {
	const service = createFakeOnlineGameService()
	gameStore.setOnlineIdentity('host', 'AB2C3D')
	gameStore.applyOnlineSnapshot(
		guessingSnapshot({ currentGuesserUid: 'host' }),
	)
	const user = userEvent.setup()
	render(OnlineMultiplayerGame, { props: { service } })

	await user.selectOptions(screen.getByLabelText('Target player'), 'p2')
	await user.type(screen.getByLabelText('Guess'), '456{Enter}')

	expect(service.submitGuess).toHaveBeenCalledWith({
		roomId: 'AB2C3D',
		targetUid: 'p2',
		guess: '456',
		turnNumber: 0,
	})
})

it('shows a waiting state for another player turn', () => {
	gameStore.setOnlineIdentity('p2', 'AB2C3D')
	gameStore.applyOnlineSnapshot(
		guessingSnapshot({ currentGuesserUid: 'host' }),
	)
	render(OnlineMultiplayerGame, {
		props: { service: createFakeOnlineGameService() },
	})

	expect(screen.getByText("Ada's turn")).toBeInTheDocument()
	expect(screen.getByLabelText('Guess')).toBeDisabled()
})

it('marks the newest online guess in history', () => {
	const snapshot = guessingSnapshot({ currentGuesserUid: 'host' })
	gameStore.setOnlineIdentity('host', 'AB2C3D')
	gameStore.applyOnlineSnapshot({
		...snapshot,
		guesses: [
			{
				id: 'turn-1',
				turnNumber: 1,
				guesserUid: 'host',
				targetUid: 'p2',
				guess: '111',
				correct: false,
				correctDigits: 1,
				correctPositions: 0,
			},
		],
	})
	render(OnlineMultiplayerGame, {
		props: { service: createFakeOnlineGameService() },
	})

	const row = screen.getByText(/1 digits, 0 positions/).closest('li')
	expect(row).toHaveClass('history-row-newest')
})

it('shows the winner and host restart action', async () => {
	const service = createFakeOnlineGameService()
	gameStore.setOnlineIdentity('host', 'AB2C3D')
	gameStore.applyOnlineSnapshot(finishedSnapshot({ winnerUid: 'host' }))
	const user = userEvent.setup()
	render(OnlineMultiplayerGame, { props: { service } })

	expect(screen.getByText('Ada wins!')).toBeInTheDocument()
	await user.click(screen.getByRole('button', { name: 'Play Again' }))
	expect(service.restartRoom).toHaveBeenCalledWith('AB2C3D')
})

it('restores a saved room and clears an expired saved session', async () => {
	const service = createFakeOnlineGameService({
		restoreSessionResult: { uid: 'host', roomId: 'AB2C3D' },
	})
	render(OnlineMultiplayerGame, { props: { service } })

	await waitFor(() => {
		expect(service.subscribeToRoom).toHaveBeenCalledWith(
			'AB2C3D',
			expect.any(Function),
			expect.any(Function),
		)
	})

	const onError = vi.mocked(service.subscribeToRoom).mock.calls[0][2]
	onError('Connection interrupted.')
	await waitFor(() => {
		expect(screen.getByText('Reconnecting…')).toBeInTheDocument()
	})

	onError('Room not found or expired.')

	expect(service.clearSession).toHaveBeenCalled()
	await waitFor(() => {
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Room not found or expired.',
		)
	})
})

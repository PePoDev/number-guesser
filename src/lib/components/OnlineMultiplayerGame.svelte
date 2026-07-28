<script lang="ts">
	import { onDestroy } from 'svelte'
	import { gameStore, sanitizeDigits } from '$lib/stores/gameStore'
	import {
		onlineGameService,
		type OnlineGameService,
	} from '$lib/services/onlineGameService'

	interface Props {
		service?: OnlineGameService
		initialRoomId?: string
	}

	let {
		service = onlineGameService,
		initialRoomId = '',
	}: Props = $props()
	let name = $state('')
	let roomIdInput = $state(initialRoomId)
	let secret = $state('')
	let guess = $state('')
	let targetUid = $state('')
	let restoreStarted = $state(false)
	let busy = $state(false)
	let copiedRoomId = $state(false)
	let copiedInviteLink = $state(false)
	let copyStatusTimer: ReturnType<typeof setTimeout> | undefined
	let shareStatusTimer: ReturnType<typeof setTimeout> | undefined
	let activeRoomId = $state($gameStore.online.roomId)
	const room = $derived($gameStore.online.room)
	const currentPlayer = $derived(
		$gameStore.online.players.find(
			(player) => player.uid === $gameStore.online.uid,
		),
	)
	const canStart = $derived(
		room !== null &&
			room.hostUid === $gameStore.online.uid &&
			$gameStore.online.players.length === room.maxPlayers &&
			$gameStore.online.players.every((player) => player.ready),
	)
	const currentGuesser = $derived(
		$gameStore.online.players.find(
			(player) => player.uid === $gameStore.online.room?.currentGuesserUid,
		),
	)
	const activeTargets = $derived(
		$gameStore.online.players.filter(
			(player) =>
				player.uid !== $gameStore.online.uid && !player.eliminated,
		),
	)
	const winner = $derived(
		$gameStore.online.players.find(
			(player) => player.uid === $gameStore.online.room?.winnerUid,
		),
	)
	const canGuess = $derived(
		$gameStore.online.room?.phase === 'guessing' &&
			$gameStore.online.room.currentGuesserUid === $gameStore.online.uid,
	)

	function errorMessage(error: unknown): string {
		return error instanceof Error
			? error.message
			: 'Something went wrong. Please retry.'
	}

	function reportError(error: unknown): void {
		const message = errorMessage(error)
		if (message === 'Connection interrupted. Reconnecting…') {
			gameStore.setOnlineStatus('reconnecting')
			return
		}
		gameStore.setOnlineStatus('error', message)
	}

	function handleSecretInput(event: Event) {
		if (!room) {
			return
		}
		const input = event.currentTarget as HTMLInputElement
		secret = sanitizeDigits(input.value, room.digitCount)
		input.value = secret
	}

	function handleOnlineGuessInput(event: Event) {
		if (!room) {
			return
		}
		const input = event.currentTarget as HTMLInputElement
		guess = sanitizeDigits(input.value, room.digitCount)
		input.value = guess
	}

	async function createRoom() {
		busy = true
		gameStore.setOnlineStatus('connecting')
		try {
			const session = await service.createRoom({
				name,
				digitCount: $gameStore.settings.digitCount,
				maxPlayers: $gameStore.settings.playerCount,
			})
			gameStore.setOnlineIdentity(session.uid, session.roomId)
			activeRoomId = session.roomId
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function joinRoom() {
		busy = true
		gameStore.setOnlineStatus('connecting')
		try {
			const session = await service.joinRoom({
				name,
				roomId: roomIdInput.trim().toUpperCase(),
			})
			gameStore.setOnlineIdentity(session.uid, session.roomId)
			activeRoomId = session.roomId
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function setSecret() {
		busy = true
		try {
			await service.setSecret({
				roomId: $gameStore.online.roomId,
				number: secret,
			})
			secret = ''
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function startRoom() {
		if (!room) {
			return
		}
		busy = true
		try {
			await service.startRoom(room.id)
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function leaveRoom() {
		if (!room) {
			return
		}
		busy = true
		try {
			await service.leaveRoom(room.id)
			activeRoomId = ''
			gameStore.clearOnlineSession()
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function submitGuess() {
		if (!room || !targetUid) {
			return
		}
		busy = true
		try {
			await service.submitGuess({
				roomId: room.id,
				targetUid,
				guess,
				turnNumber: room.turnNumber,
			})
			guess = ''
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	function handleGuessSubmit(event: SubmitEvent) {
		event.preventDefault()
		void submitGuess()
	}

	async function restartRoom() {
		if (!room) {
			return
		}
		busy = true
		try {
			await service.restartRoom(room.id)
		} catch (error) {
			reportError(error)
		} finally {
			busy = false
		}
	}

	async function copyRoomId() {
		if (!room) {
			return
		}
		try {
			await navigator.clipboard.writeText(room.id)
			copiedRoomId = true
			clearTimeout(copyStatusTimer)
			copyStatusTimer = setTimeout(() => {
				copiedRoomId = false
			}, 2000)
		} catch (error) {
			reportError(error)
		}
	}

	function roomInviteUrl(roomId: string): string {
		const url = new URL(window.location.href)
		url.search = ''
		url.hash = ''
		url.searchParams.set('room', roomId)
		return url.toString()
	}

	async function copyInviteLink(url: string) {
		await navigator.clipboard.writeText(url)
		copiedInviteLink = true
		clearTimeout(shareStatusTimer)
		shareStatusTimer = setTimeout(() => {
			copiedInviteLink = false
		}, 2000)
	}

	async function shareRoom() {
		if (!room) {
			return
		}
		const url = roomInviteUrl(room.id)
		try {
			if (navigator.share) {
				await navigator.share({
					title: 'Number Guessing Game',
					text: `Join my number guessing room ${room.id}.`,
					url,
				})
				return
			}
		} catch {}
		try {
			await copyInviteLink(url)
		} catch (error) {
			reportError(error)
		}
	}

	onDestroy(() => {
		clearTimeout(copyStatusTimer)
		clearTimeout(shareStatusTimer)
	})

	$effect(() => {
		if (restoreStarted || initialRoomId || $gameStore.online.roomId) {
			return
		}
		restoreStarted = true
		void service
			.restoreSession()
			.then((session) => {
				if (session) {
					gameStore.setOnlineIdentity(session.uid, session.roomId)
					activeRoomId = session.roomId
				}
			})
			.catch((error: unknown) => {
				reportError(error)
			})
	})

	$effect(() => {
		const roomId = activeRoomId
		if (!roomId) {
			return
		}
		return service.subscribeToRoom(
			roomId,
			(snapshot) => gameStore.applyOnlineSnapshot(snapshot),
			(message) => {
				if (message === 'Room not found or expired.') {
					service.clearSession()
					activeRoomId = ''
					gameStore.clearOnlineSession()
					gameStore.setOnlineStatus('error', message)
					return
				}
				gameStore.setOnlineStatus('reconnecting')
			},
		)
	})
</script>

{#if $gameStore.online.error}
	<p role="alert" class="banner banner-incorrect mb-4">
		{$gameStore.online.error}
	</p>
{/if}

{#if $gameStore.online.status === 'reconnecting'}
	<p aria-live="polite" class="banner banner-warning mb-4">
		Reconnecting…
	</p>
{/if}

{#if !room}
	<section
		aria-labelledby="online-entry-heading"
		class="space-y-5 text-[var(--glass-fg)]"
	>
		<div>
			<p class="text-sm uppercase tracking-widest text-[var(--glass-muted)]">
				Online Multiplayer
			</p>
			<h2 id="online-entry-heading" class="font-display text-2xl font-bold">
				Play with friends.
			</h2>
		</div>

		<label class="block space-y-2">
			<span>Display name</span>
			<input
				bind:value={name}
				disabled={busy}
				maxlength="20"
				class="field-input w-full text-left"
			/>
		</label>

		<div class="grid gap-3 sm:grid-cols-2">
			<button
				type="button"
				onclick={createRoom}
				disabled={busy || !name.trim()}
				class="btn-primary"
			>
				Create Room
			</button>
			<div class="space-y-2">
				<label class="block space-y-2">
					<span>Room ID</span>
					<input
						bind:value={roomIdInput}
						disabled={busy}
						maxlength="6"
						class="field-input w-full uppercase"
					/>
				</label>
				<button
					type="button"
					onclick={joinRoom}
					disabled={busy || !name.trim() || roomIdInput.trim().length !== 6}
					class="btn-primary w-full"
				>
					Join Room
				</button>
			</div>
		</div>
		<p aria-live="polite" class="text-sm text-[var(--glass-muted)]">
			{busy
				? 'Connecting…'
				: 'Create a room or enter the ID from another player.'}
		</p>
	</section>
{:else if room.phase === 'lobby'}
	<section
		aria-labelledby="online-lobby-heading"
		class="space-y-5 text-[var(--glass-fg)]"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-sm uppercase tracking-widest text-[var(--glass-muted)]">
					Lobby
				</p>
				<h2 id="online-lobby-heading" class="font-display text-2xl font-bold">
					Room <span data-testid="room-id">{room.id}</span>
				</h2>
			</div>
			<div class="flex flex-wrap gap-2">
				<div class="relative">
					{#if copiedRoomId}
						<span
							role="status"
							class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fg)] px-3 py-2 text-sm text-[var(--glass-bg)] shadow-lg"
						>
							Copied!
						</span>
					{/if}
					<button type="button" onclick={copyRoomId} class="btn-secondary">
						Copy Room ID
					</button>
				</div>
				<div class="relative">
					{#if copiedInviteLink}
						<span
							role="status"
							class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fg)] px-3 py-2 text-sm text-[var(--glass-bg)] shadow-lg"
						>
							Link copied!
						</span>
					{/if}
					<button type="button" onclick={shareRoom} class="btn-secondary">
						Share
					</button>
				</div>
			</div>
		</div>

		<p>{`${$gameStore.online.players.length} / ${room.maxPlayers} players`}</p>
		<ul class="space-y-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li class="history-row flex items-center justify-between px-3 py-2">
					<span>
						{player.name}
						{#if player.uid === room.hostUid}
							<small>(Host)</small>
						{/if}
					</span>
					<span>{player.ready ? 'Ready' : 'Waiting'}</span>
				</li>
			{/each}
		</ul>

		{#if currentPlayer}
			<label class="block space-y-2">
				<span>Secret number</span>
				<input
					value={secret}
					oninput={handleSecretInput}
					disabled={busy}
					inputmode="numeric"
					class="field-input w-full"
				/>
			</label>
			<button
				type="button"
				onclick={setSecret}
				disabled={busy || secret.length !== room.digitCount}
				class="btn-primary"
			>
				{currentPlayer.ready ? 'Update Secret' : 'Ready'}
			</button>
			{#if currentPlayer.ready}
				<p aria-live="polite">
					Your secret is ready. Enter another number to replace it.
				</p>
			{/if}
		{/if}

		<div class="flex flex-wrap gap-3">
			{#if room.hostUid === $gameStore.online.uid}
				<button
					type="button"
					onclick={startRoom}
					disabled={busy || !canStart}
					class="btn-primary"
				>
					Start Game
				</button>
			{/if}
			<button
				type="button"
				onclick={leaveRoom}
				disabled={busy}
				class="btn-secondary"
			>
				Leave Room
			</button>
		</div>
	</section>
{:else if room.phase === 'guessing'}
	<section
		aria-labelledby="online-game-heading"
		class="space-y-5 text-[var(--glass-fg)]"
	>
		<div>
			<p class="text-sm uppercase tracking-widest text-[var(--glass-muted)]">
				Room {room.id}
			</p>
			<h2 id="online-game-heading" aria-live="polite" class="font-display text-2xl font-bold">
				{currentGuesser?.name ?? 'Player'}'s turn
			</h2>
		</div>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li
					class="history-row px-3 py-2 {player.eliminated ? 'history-row-eliminated' : ''}"
				>
					<strong>{player.name}</strong>
					<span class="ml-2">
						{player.eliminated ? 'Eliminated' : 'Active'}
					</span>
				</li>
			{/each}
		</ul>

		<form class="space-y-5" onsubmit={handleGuessSubmit}>
			<label class="block space-y-2">
				<span>Target player</span>
				<select
					bind:value={targetUid}
					disabled={!canGuess || busy}
					class="field-select w-full"
				>
					<option value="">Choose a player</option>
					{#each activeTargets as player (player.uid)}
						<option value={player.uid}>{player.name}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-2">
				<span>Guess</span>
				<input
					value={guess}
					oninput={handleOnlineGuessInput}
					disabled={!canGuess || busy}
					inputmode="numeric"
					class="field-input w-full"
				/>
			</label>
			<button
				type="submit"
				disabled={!canGuess ||
					busy ||
					!targetUid ||
					guess.length !== room.digitCount}
				class="btn-primary"
			>
				Submit Guess
			</button>
		</form>

		<h3 class="font-display text-lg font-bold">Guess history</h3>
		{#if $gameStore.online.guesses.length === 0}
			<p class="text-[var(--glass-muted)]">No guesses yet.</p>
		{:else}
			<ol class="space-y-2">
				{#each $gameStore.online.guesses as entry, index (entry.id)}
					<li class="history-row px-3 py-2 {index === $gameStore.online.guesses.length - 1 ? 'history-row-newest' : ''}">
						<strong>
							{$gameStore.online.players.find(
								(player) => player.uid === entry.guesserUid,
							)?.name ?? 'Player'}
						</strong>
						guessed {entry.guess} for
						{$gameStore.online.players.find(
							(player) => player.uid === entry.targetUid,
						)?.name ?? 'Player'}:
						{entry.correctDigits} digits, {entry.correctPositions} positions
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{:else}
	<section
		aria-labelledby="online-finished-heading"
		class="space-y-5 text-[var(--glass-fg)]"
	>
		<p class="text-sm uppercase tracking-widest text-[var(--glass-muted)]">
			Room {room.id}
		</p>
		<h2 id="online-finished-heading" class="font-display text-2xl font-bold">
			{winner?.name ?? 'Player'} wins!
		</h2>
		{#if room.hostUid === $gameStore.online.uid}
			<button
				type="button"
				onclick={restartRoom}
				disabled={busy}
				class="btn-primary"
			>
				Play Again
			</button>
		{:else}
			<p aria-live="polite">Waiting for the host to restart.</p>
		{/if}
		<button
			type="button"
			onclick={leaveRoom}
			disabled={busy}
			class="btn-secondary"
		>
			Leave Room
		</button>
	</section>
{/if}

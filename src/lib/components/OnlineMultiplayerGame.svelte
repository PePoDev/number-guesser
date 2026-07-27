<script lang="ts">
	import { gameStore } from '$lib/stores/gameStore'
	import {
		onlineGameService,
		type OnlineGameService,
	} from '$lib/services/onlineGameService'

	interface Props {
		service?: OnlineGameService
	}

	let { service = onlineGameService }: Props = $props()
	let name = $state('')
	let roomIdInput = $state('')
	let secret = $state('')
	let guess = $state('')
	let targetUid = $state('')
	let restoreStarted = $state(false)
	let busy = $state(false)
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
		if (room) {
			await navigator.clipboard.writeText(room.id)
		}
	}

	$effect(() => {
		if (restoreStarted || $gameStore.online.roomId) {
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
	<p
		role="alert"
		class="mb-4 rounded-lg border border-[var(--state-incorrect)] p-3 text-[var(--glass-fg)]"
	>
		{$gameStore.online.error}
	</p>
{/if}

{#if $gameStore.online.status === 'reconnecting'}
	<p aria-live="polite" class="mb-4 text-[var(--state-warning)]">
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
			<h2 id="online-entry-heading" class="text-3xl font-bold">
				Play with <em class="text-[var(--glass-accent)]">friends.</em>
			</h2>
		</div>

		<label class="block space-y-2">
			<span>Display name</span>
			<input
				bind:value={name}
				disabled={busy}
				maxlength="20"
				class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
			/>
		</label>

		<div class="grid gap-3 sm:grid-cols-2">
			<button
				type="button"
				onclick={createRoom}
				disabled={busy || !name.trim()}
				class="rounded-lg border border-[var(--glass-border)] bg-[var(--accent-purple)] p-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
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
						class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 uppercase"
					/>
				</label>
				<button
					type="button"
					onclick={joinRoom}
					disabled={busy || !name.trim() || roomIdInput.trim().length !== 6}
					class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--accent-blue)] p-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
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
				<h2 id="online-lobby-heading" class="text-3xl font-bold">
					Room <span data-testid="room-id">{room.id}</span>
				</h2>
			</div>
			<button
				type="button"
				onclick={copyRoomId}
				class="rounded-lg border border-[var(--glass-border)] px-3 py-2"
			>
				Copy Room ID
			</button>
		</div>

		<p>{`${$gameStore.online.players.length} / ${room.maxPlayers} players`}</p>
		<ul class="space-y-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li
					class="flex items-center justify-between rounded-lg border border-[var(--glass-border)] p-3"
				>
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
					bind:value={secret}
					disabled={busy}
					inputmode="numeric"
					maxlength={room.digitCount}
					class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
				/>
			</label>
			<button
				type="button"
				onclick={setSecret}
				disabled={busy || secret.length !== room.digitCount}
				class="rounded-lg border border-[var(--glass-border)] bg-[var(--accent-purple)] px-4 py-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
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
					class="rounded-lg border border-[var(--glass-border)] bg-[var(--accent-blue)] px-4 py-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
				>
					Start Game
				</button>
			{/if}
			<button
				type="button"
				onclick={leaveRoom}
				disabled={busy}
				class="rounded-lg border border-[var(--glass-border)] px-4 py-3"
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
			<h2 id="online-game-heading" class="text-3xl font-bold">
				{currentGuesser?.name ?? 'Player'}'s turn
			</h2>
		</div>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li
					class="rounded-lg border border-[var(--glass-border)] p-3"
					class:opacity-50={player.eliminated}
				>
					<strong>{player.name}</strong>
					<span class="ml-2">
						{player.eliminated ? 'Eliminated' : 'Active'}
					</span>
				</li>
			{/each}
		</ul>

		<label class="block space-y-2">
			<span>Target player</span>
			<select
				bind:value={targetUid}
				disabled={!canGuess || busy}
				class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
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
				bind:value={guess}
				disabled={!canGuess || busy}
				inputmode="numeric"
				maxlength={room.digitCount}
				class="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
			/>
		</label>
		<button
			type="button"
			onclick={submitGuess}
			disabled={!canGuess ||
				busy ||
				!targetUid ||
				guess.length !== room.digitCount}
			class="rounded-lg border border-[var(--glass-border)] bg-[var(--accent-purple)] px-4 py-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
		>
			Submit Guess
		</button>

		<h3 class="text-xl font-bold">Guess history</h3>
		{#if $gameStore.online.guesses.length === 0}
			<p class="text-[var(--glass-muted)]">No guesses yet.</p>
		{:else}
			<ol class="space-y-2">
				{#each $gameStore.online.guesses as entry (entry.id)}
					<li class="rounded-lg border border-[var(--glass-border)] p-3">
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
		<h2 id="online-finished-heading" class="text-3xl font-bold">
			{winner?.name ?? 'Player'} wins!
		</h2>
		{#if room.hostUid === $gameStore.online.uid}
			<button
				type="button"
				onclick={restartRoom}
				disabled={busy}
				class="rounded-lg border border-[var(--glass-border)] bg-[var(--accent-purple)] px-4 py-3 font-bold text-[var(--accent-purple-fg)] disabled:opacity-50"
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
			class="rounded-lg border border-[var(--glass-border)] px-4 py-3"
		>
			Leave Room
		</button>
	</section>
{/if}

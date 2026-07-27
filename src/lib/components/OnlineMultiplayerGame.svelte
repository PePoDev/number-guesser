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
	let busy = $state(false)
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
			gameStore.clearOnlineSession()
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
		const roomId = $gameStore.online.roomId
		if (!roomId) {
			return
		}
		return service.subscribeToRoom(
			roomId,
			(snapshot) => gameStore.applyOnlineSnapshot(snapshot),
			(message) => {
				if (message === 'Room not found or expired.') {
					service.clearSession()
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
{/if}

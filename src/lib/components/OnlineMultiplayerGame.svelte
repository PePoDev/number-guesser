<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { gameStore, sanitizeDigits } from '$lib/stores/gameStore'
	import {
		onlineGameService,
		preloadOnlineBackend,
		type OnlineGameService,
	} from '$lib/services/onlineGameService'
	import { isOnlineErrorCode, type OnlineErrorCode } from '$lib/online/types'
	import { messages } from '$lib/i18n/messages'

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
	const t = $derived(messages[$gameStore.locale])
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

	function playerName(uid: string | null | undefined): string {
		return (
			$gameStore.online.players.find((player) => player.uid === uid)?.name ??
			t.online.unknownPlayer
		)
	}

	function reportError(
		error: unknown,
		fallback: OnlineErrorCode = 'ONLINE_GAME_INTERNAL',
	): void {
		const code =
			error instanceof Error && isOnlineErrorCode(error.message)
				? error.message
				: fallback
		if (code === 'CONNECTION_INTERRUPTED') {
			gameStore.setOnlineStatus('reconnecting')
			return
		}
		gameStore.setOnlineStatus('error', code)
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
			reportError(error, 'CLIPBOARD_FAILED')
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
					title: t.title,
					text: t.online.shareText(room.id),
					url,
				})
				return
			}
		} catch {}
		try {
			await copyInviteLink(url)
		} catch (error) {
			reportError(error, 'CLIPBOARD_FAILED')
		}
	}

	onMount(() => {
		if (service === onlineGameService) {
			preloadOnlineBackend()
		}
	})

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
			(code) => {
				if (code === 'ROOM_NOT_FOUND') {
					service.clearSession()
					activeRoomId = ''
					gameStore.clearOnlineSession()
					gameStore.setOnlineStatus('error', code)
					return
				}
				gameStore.setOnlineStatus('reconnecting')
			},
		)
	})
</script>

{#if $gameStore.online.error}
	<p role="alert" class="banner banner-incorrect mb-4">
		{t.online.errors[$gameStore.online.error]}
	</p>
{/if}

{#if $gameStore.online.status === 'reconnecting'}
	<p aria-live="polite" class="banner banner-warning mb-4">
		{t.online.reconnecting}
	</p>
{/if}

{#if !room}
	<section
		aria-labelledby="online-entry-heading"
		class="space-y-5 text-[var(--glass-fg)]"
	>
		<div>
			<p class="text-sm uppercase tracking-widest text-[var(--glass-muted)]">
				{t.modes.online}
			</p>
			<h2 id="online-entry-heading" class="font-display text-2xl font-bold">
				{t.online.entryHeading}
			</h2>
		</div>

		<label class="block space-y-2">
			<span>{t.online.displayName}</span>
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
				{t.online.createRoom}
			</button>
			<div class="space-y-2">
				<label class="block space-y-2">
					<span>{t.online.roomId}</span>
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
					{t.online.joinRoom}
				</button>
			</div>
		</div>
		<p aria-live="polite" class="text-sm text-[var(--glass-muted)]">
			{busy ? t.online.connecting : t.online.entryHint}
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
					{t.online.lobby}
				</p>
				<h2 id="online-lobby-heading" class="font-display text-2xl font-bold">
					{t.online.room} <span data-testid="room-id">{room.id}</span>
				</h2>
			</div>
			<div class="flex flex-wrap gap-2">
				<div class="relative">
					{#if copiedRoomId}
						<span
							role="status"
							class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fg)] px-3 py-2 text-sm text-[var(--glass-bg)] shadow-lg"
						>
							{t.online.copied}
						</span>
					{/if}
					<button type="button" onclick={copyRoomId} class="btn-secondary">
						{t.online.copyRoomId}
					</button>
				</div>
				<div class="relative">
					{#if copiedInviteLink}
						<span
							role="status"
							class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fg)] px-3 py-2 text-sm text-[var(--glass-bg)] shadow-lg"
						>
							{t.online.linkCopied}
						</span>
					{/if}
					<button type="button" onclick={shareRoom} class="btn-secondary">
						{t.online.share}
					</button>
				</div>
			</div>
		</div>

		<p>{t.online.playerCount($gameStore.online.players.length, room.maxPlayers)}</p>
		<ul class="space-y-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li class="history-row flex items-center justify-between px-3 py-2">
					<span>
						{player.name}
						{#if player.uid === room.hostUid}
							<small>{t.online.host}</small>
						{/if}
					</span>
					<span>{player.ready ? t.online.ready : t.online.waiting}</span>
				</li>
			{/each}
		</ul>

		{#if currentPlayer}
			<label class="block space-y-2">
				<span>{t.online.secretLabel}</span>
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
				{currentPlayer.ready ? t.online.updateSecret : t.online.markReady}
			</button>
			{#if currentPlayer.ready}
				<p aria-live="polite">
					{t.online.secretReady}
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
					{t.online.startGame}
				</button>
			{/if}
			<button
				type="button"
				onclick={leaveRoom}
				disabled={busy}
				class="btn-secondary"
			>
				{t.online.leaveRoom}
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
				{t.online.roomLabel(room.id)}
			</p>
			<h2 id="online-game-heading" aria-live="polite" class="font-display text-2xl font-bold">
				{t.online.turn(currentGuesser?.name ?? t.online.unknownPlayer)}
			</h2>
		</div>

		<ul class="grid gap-2 sm:grid-cols-2">
			{#each $gameStore.online.players as player (player.uid)}
				<li
					class="history-row px-3 py-2 {player.eliminated ? 'history-row-eliminated' : ''}"
				>
					<strong>{player.name}</strong>
					<span class="ml-2">
						{player.eliminated ? t.online.eliminated : t.online.active}
					</span>
				</li>
			{/each}
		</ul>

		<form class="space-y-5" onsubmit={handleGuessSubmit}>
			<label class="block space-y-2">
				<span>{t.online.targetLabel}</span>
				<select
					bind:value={targetUid}
					disabled={!canGuess || busy}
					class="field-select w-full"
				>
					<option value="">{t.online.choosePlayer}</option>
					{#each activeTargets as player (player.uid)}
						<option value={player.uid}>{player.name}</option>
					{/each}
				</select>
			</label>
			<label class="block space-y-2">
				<span>{t.online.guessLabel}</span>
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
				{t.online.submit}
			</button>
		</form>

		<h3 class="font-display text-lg font-bold">{t.online.historyHeading}</h3>
		{#if $gameStore.online.guesses.length === 0}
			<p class="text-[var(--glass-muted)]">{t.online.historyEmpty}</p>
		{:else}
			<ol class="space-y-2">
				{#each $gameStore.online.guesses as entry, index (entry.id)}
					<li class="history-row px-3 py-2 {index === $gameStore.online.guesses.length - 1 ? 'history-row-newest' : ''}">
						<strong>{playerName(entry.guesserUid)}</strong>{t.online.historyEntry(
							entry.guess,
							playerName(entry.targetUid),
							entry.correctDigits,
							entry.correctPositions,
						)}
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
			{t.online.roomLabel(room.id)}
		</p>
		<h2 id="online-finished-heading" class="font-display text-2xl font-bold">
			{t.online.wins(winner?.name ?? t.online.unknownPlayer)}
		</h2>
		{#if room.hostUid === $gameStore.online.uid}
			<button
				type="button"
				onclick={restartRoom}
				disabled={busy}
				class="btn-primary"
			>
				{t.online.playAgain}
			</button>
		{:else}
			<p aria-live="polite">{t.online.waitingForHost}</p>
		{/if}
		<button
			type="button"
			onclick={leaveRoom}
			disabled={busy}
			class="btn-secondary"
		>
			{t.online.leaveRoom}
		</button>
	</section>
{/if}

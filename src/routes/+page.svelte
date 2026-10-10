<script lang="ts">
	import { gameStore } from '$lib/stores/gameStore';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import SinglePlayerGame from '$lib/components/SinglePlayerGame.svelte';
	import MultiPlayerGame from '$lib/components/MultiPlayerGame.svelte';
	import OnlineMultiplayerGame from '$lib/components/OnlineMultiplayerGame.svelte';
	import GitHubStarLink from '$lib/components/GitHubStarLink.svelte';
	import { onlineGameService } from '$lib/services/onlineGameService';
	import { messages } from '$lib/i18n/messages';

	type NavMode = 'single' | 'multi' | 'online';

	let showSettings = $state(false);
	let showInstructions = $state(false);
	let sessionRestoreStarted = $state(false);
	let chosenMultiMode = $state<'multi' | 'online'>('multi');
	let invitedRoomId = $state('');
	const displayedDigitCount = $derived(
		$gameStore.mode === 'online' && $gameStore.online.room
			? $gameStore.online.room.digitCount
			: $gameStore.settings.digitCount,
	);

	const t = $derived(messages[$gameStore.locale]);
	const settingsLabel = $derived(t.header.openSettings(t.modes[$gameStore.mode]));
	const tickerText = $derived(`${t.ticker.join(' ✦ ')} ✦ `);

	function openSettings() {
		showSettings = true;
	}

	function closeSettings() {
		showSettings = false;
	}

	function startNewGame() {
		showInstructions = false;
		gameStore.startNewGame();
	}

	function selectMode(mode: NavMode) {
		showInstructions = false;
		if (mode === 'multi' || mode === 'online') {
			chosenMultiMode = mode;
		}
		if ($gameStore.mode === mode) {
			return;
		}
		gameStore.setMode(mode);
		gameStore.startNewGame();
	}

	function toggleInstructions() {
		showInstructions = !showInstructions;
	}

	$effect(() => {
		if ($gameStore.mode === 'multi' || $gameStore.mode === 'online') {
			chosenMultiMode = $gameStore.mode;
		}
	});

	$effect(() => {
		if (sessionRestoreStarted) {
			return;
		}

		sessionRestoreStarted = true;
		// Single player is always ready to play; the online component reconnects
		// a saved room or pre-fills an invite on its own.
		gameStore.startNewGame();
		const roomId =
			new URL(window.location.href).searchParams
				.get('room')
				?.trim()
				.toUpperCase() ?? '';
		const savedRoomId = onlineGameService.savedRoomId();

		if (/^[A-Z2-9]{6}$/.test(roomId)) {
			invitedRoomId = roomId === savedRoomId ? '' : roomId;
			gameStore.setMode('online');
		} else if (savedRoomId) {
			gameStore.setMode('online');
		}
	});
</script>

<svelte:head>
	<title>{t.title}</title>
</svelte:head>

<div class="stage flex min-h-screen items-center justify-center p-3 sm:p-5">
	<div class="stage-frame flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl md:rounded-3xl">
		<div class="ticker">
			<div class="ticker-track">
				<span class="ticker-seq">{tickerText}</span>
				<span class="ticker-seq" aria-hidden="true">{tickerText}</span>
			</div>
		</div>

		<div class="stage-body grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[140px_minmax(320px,6fr)_minmax(0,4fr)]">
			<nav class="nav-rail grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-1 md:grid-rows-[1fr_1fr_1fr_auto]" aria-label={t.nav.label}>
				<button
					type="button"
					class="nav-card nav-blue"
					aria-pressed={$gameStore.mode === 'single' && !showInstructions}
					onclick={() => selectMode('single')}
				>
					<span class="nav-meta">
						<span>01</span>
						<svg class="max-sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</span>
					<span class="nav-label">{t.nav.single}</span>
				</button>
				<button
					type="button"
					class="nav-card nav-yellow"
					aria-pressed={($gameStore.mode === 'multi' || $gameStore.mode === 'online') && !showInstructions}
					onclick={() => selectMode(chosenMultiMode)}
				>
					<span class="nav-meta">
						<span>02</span>
						<svg class="max-sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</span>
					<span class="nav-label">{t.nav.multi}</span>
				</button>
				<button
					type="button"
					class="nav-card nav-orange"
					aria-pressed={showInstructions}
					onclick={toggleInstructions}
				>
					<span class="nav-meta">
						<span>03</span>
						<svg class="max-sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</span>
					<span class="nav-label">{t.nav.instructions}</span>
				</button>
				<button
					type="button"
					class="nav-card nav-primary"
					disabled={$gameStore.mode === 'online'}
					onclick={startNewGame}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
						<path d="M3 3v5h5" />
					</svg>
					<span class="nav-label">{t.nav.newGame}</span>
				</button>
			</nav>

			<main class="panel p-5 sm:p-6 md:p-8">
				<header class="game-info mb-6 space-y-2">
					<!-- wrap-reverse lifts the icons above the title, not below it, when the title needs the full width. -->
					<div class="flex flex-wrap-reverse items-center justify-between gap-3">
						<h1 class="font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-tight">
							{t.header.title} <em class="sig">{t.header.titleSignature}</em>
						</h1>
						<div class="ml-auto flex shrink-0 items-center gap-2">
							<button
								type="button"
								class="btn-secondary btn-icon"
								aria-label={settingsLabel}
								title={settingsLabel}
								aria-haspopup="dialog"
								aria-expanded={showSettings}
								onclick={openSettings}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							</button>
							<GitHubStarLink />
						</div>
					</div>
					{#if !showInstructions}
						<p>
							{#each t.header.thinking(displayedDigitCount) as part}{#if typeof part === 'string'}{part}{:else}<span class="accent-value">{part.value}</span>{/if}{/each}
						</p>
						{#if $gameStore.mode === 'single'}
							<p>
								{#each t.header.attemptsLeft($gameStore.attemptsLeft) as part}{#if typeof part === 'string'}{part}{:else}<span class="accent-value">{part.value}</span>{/if}{/each}
							</p>
						{/if}
						{#if $gameStore.mode === 'multi' || $gameStore.mode === 'online'}
							<div class="mt-4">
								<div class="variant-switch" role="group" aria-label={t.header.multiplayerType}>
									<button
										type="button"
										aria-pressed={$gameStore.mode === 'multi'}
										onclick={() => selectMode('multi')}
									>
										{t.header.local}
									</button>
									<button
										type="button"
										aria-pressed={$gameStore.mode === 'online'}
										onclick={() => selectMode('online')}
									>
										{t.header.online}
									</button>
								</div>
							</div>
						{/if}
					{/if}
				</header>

				{#if showInstructions}
					<section aria-labelledby="instructions-heading" class="space-y-4">
						<h2 id="instructions-heading" class="font-display text-2xl font-bold">{t.instructions.heading}</h2>
						<ul class="list-disc space-y-2 pl-5 text-sm">
							{#each t.instructions.steps as step}
								<li>{#if step.term}<strong>{step.term}</strong>{' '}{/if}{step.text}</li>
							{/each}
						</ul>
						<h3 class="font-display text-lg font-bold">{t.instructions.friendsHeading}</h3>
						<ul class="list-disc space-y-2 pl-5 text-sm">
							{#each t.instructions.friendsSteps as step}
								<li>{step}</li>
							{/each}
						</ul>
					</section>
				{/if}
				<div hidden={showInstructions}>
					{#if $gameStore.mode === 'single'}
						<SinglePlayerGame />
					{:else if $gameStore.mode === 'multi'}
						<MultiPlayerGame />
					{:else}
						<OnlineMultiplayerGame initialRoomId={invitedRoomId} />
					{/if}
				</div>
			</main>

			<aside class="hero hidden md:flex" aria-hidden="true">
				<div class="tunnel">
					{#each [0, 1, 2, 3, 4, 5] as i}
						<div class="tunnel-ring" style="--i: {i};">
							<span class="tunnel-tile tunnel-tile-a">{(i * 3 + 1) % 10}</span>
							<span class="tunnel-tile tunnel-tile-b">{(i * 3 + 2) % 10}</span>
							<span class="tunnel-tile tunnel-tile-c">{(i * 3 + 3) % 10}</span>
						</div>
					{/each}
				</div>
			</aside>
		</div>

		<footer class="utility-row">
			<span><kbd>Enter</kbd> {t.footer.submit} · <kbd>Escape</kbd> {t.footer.close}</span>
			<span>{t.modes[$gameStore.mode]}</span>
		</footer>
	</div>
</div>

{#if showSettings}
	<SettingsModal mode={$gameStore.mode} onclose={closeSettings} />
{/if}

<style>
	.stage {
		background-color: var(--stage-bg);
		background-image:
			linear-gradient(var(--stage-grid) 1.5px, transparent 1.5px),
			linear-gradient(90deg, var(--stage-grid) 1.5px, transparent 1.5px);
		background-size: 24px 24px;
	}

	@media (min-width: 600px) {
		.stage {
			background-size: 32px 32px;
		}
	}

	.stage-frame {
		border: 2px solid var(--stage-border);
	}

	.ticker {
		background: var(--ticker-bg);
		color: var(--ticker-fg);
		overflow: hidden;
		border-bottom: 1.5px solid var(--stage-border);
	}

	.ticker-track {
		display: flex;
		width: max-content;
		animation: ticker-scroll 40s linear infinite;
	}

	.ticker-seq {
		padding: 10px 0;
		white-space: nowrap;
		font-family: var(--font-display);
		font-size: 0.8125rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.ticker-seq:lang(th) {
		letter-spacing: 0.02em;
	}

	@keyframes ticker-scroll {
		to {
			transform: translateX(-50%);
		}
	}

	.nav-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 10px;
		min-height: 96px;
		padding: 12px;
		background: var(--nav-accent);
		color: var(--nav-fg);
		border: 1.5px solid var(--stage-border);
		border-radius: 16px;
		text-align: left;
		cursor: pointer;
	}

	.nav-card:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.nav-card[aria-pressed='true'] {
		box-shadow: inset 0 0 0 2.5px var(--stage-border);
	}

	.nav-card:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: var(--font-display);
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.nav-label {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.95rem;
		line-height: 1.1;
	}

	.nav-blue {
		--nav-accent: var(--accent-blue);
		--nav-fg: var(--accent-blue-fg);
	}

	.nav-yellow {
		--nav-accent: var(--accent-yellow);
		--nav-fg: var(--accent-yellow-fg);
	}

	.nav-orange {
		--nav-accent: var(--accent-orange);
		--nav-fg: var(--accent-orange-fg);
	}

	.nav-primary {
		--nav-accent: var(--accent-purple);
		--nav-fg: var(--accent-purple-fg);
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 56px;
	}

	@media (max-width: 599px) {
		.ticker-track {
			width: auto;
			animation: none;
		}

		.ticker-seq {
			padding: 8px 12px;
			white-space: normal;
			text-align: center;
			line-height: 1.5;
		}

		.ticker-seq[aria-hidden='true'] {
			display: none;
		}

		.nav-card {
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			gap: 8px;
			min-height: 48px;
			padding: 8px 12px;
		}

		.nav-label {
			font-size: 0.8125rem;
		}

		.nav-primary {
			min-height: 48px;
		}
	}

	@media (min-width: 600px) and (max-width: 899px) {
		.nav-card {
			min-height: 72px;
		}

		.nav-label {
			font-size: 0.875rem;
		}

		.nav-primary {
			flex-direction: column;
			gap: 4px;
		}
	}

	.sig {
		font-style: italic;
		font-weight: 700;
		color: var(--glass-accent);
		background: var(--stage-border);
		padding: 0 0.2em;
		border-radius: 0.2em;
	}

	.variant-switch {
		display: inline-flex;
		border: 1.5px solid var(--glass-border);
		border-radius: 14px;
		overflow: hidden;
		background: var(--surface-white);
	}

	.variant-switch button {
		padding: 10px 20px;
		font-weight: 600;
		color: var(--glass-fg);
		cursor: pointer;
	}

	.variant-switch button[aria-pressed='true'] {
		background: var(--stage-border);
		color: var(--glass-bg);
	}

	/* The switch clips overflow for its rounded corners, so the focus ring sits inside. */
	.variant-switch button:focus-visible {
		outline-offset: -4px;
		box-shadow: inset 0 0 0 6px var(--state-info);
	}

	.hero {
		align-items: center;
		justify-content: center;
		perspective: 700px;
		overflow: hidden;
	}

	.tunnel {
		position: relative;
		width: 240px;
		height: 320px;
		transform-style: preserve-3d;
		transform: rotateX(8deg) rotateY(-12deg);
	}

	.tunnel-ring {
		position: absolute;
		inset: 0;
		border: 1.5px solid var(--stage-grid);
		border-radius: 20px;
		transform: translateZ(calc(var(--i) * -80px));
		opacity: calc(1 - var(--i) * 0.14);
	}

	.tunnel-tile {
		position: absolute;
		display: grid;
		place-items: center;
		width: 44px;
		height: 56px;
		border: 1.5px solid var(--stage-grid);
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-white) 6%, transparent);
		color: var(--ticker-fg);
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 700;
	}

	.tunnel-tile-a {
		top: -22px;
		left: 12%;
	}

	.tunnel-tile-b {
		top: 40%;
		right: -22px;
	}

	.tunnel-tile-c {
		bottom: -22px;
		left: 38%;
	}

	.utility-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 4px 24px;
		padding: 10px 16px;
		border-top: 1.5px solid var(--stage-border);
		color: var(--ticker-fg);
		font-size: 0.8125rem;
	}

	.utility-row kbd {
		font-family: var(--font-display);
		font-weight: 700;
	}
</style>

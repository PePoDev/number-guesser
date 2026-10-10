<script lang="ts">
import { tick, untrack } from 'svelte';
import {
	gameStore,
	validateGuess,
	calculateFeedback,
	sanitizeDigits,
	type GuessEntry,
} from '$lib/stores/gameStore';
import { messages, type Messages } from '$lib/i18n/messages';
	
const playerAccents = ['blue', 'yellow', 'orange', 'green'];
	
let playerNameInput = $state('');
let playerNumberInput = $state('');
let multiGuessInput = $state('');
let targetPlayerIndex = $state(0);
let secretVisible = $state(false);
let nameField = $state<HTMLInputElement>();
// Changes only when a new player starts setup, so typing is never overwritten.
const setupSlot = $derived(
	$gameStore.gamePhase === 'setup'
		? `${$gameStore.round}:${$gameStore.currentSetupPlayer}`
		: '',
);
// Feedback keeps a renderer rather than text so it follows language changes.
let feedback = $state<((t: Messages) => string) | null>(null);
const t = $derived(messages[$gameStore.locale]);

function playerName(index: number): string {
	return $gameStore.players[index]?.name || t.multi.playerName(index + 1);
}
	
$effect(() => {
	if (!setupSlot) return;
	playerNameInput = untrack(
		() => $gameStore.players[$gameStore.currentSetupPlayer]?.name ?? '',
	);
	secretVisible = false;
});

$effect(() => {
	if ($gameStore.gamePhase === 'guessing' && $gameStore.activePlayers.length > 0) {
		// Set default target to first available player that's not current guesser
		const availableTargets = $gameStore.activePlayers.filter(p => p !== $gameStore.currentGuesser);
		if (availableTargets.length > 0) {
			targetPlayerIndex = availableTargets[0];
		}
	}
});

function savePlayerSetup() {
	const name = playerNameInput.trim();
	let number = playerNumberInput.trim();
	
	if (!number) {
		feedback = (t) => t.multi.secretRequired;
		return;
	}
	
	// Pad with leading zeros if needed
	if (number.length < $gameStore.settings.digitCount && !isNaN(Number(number)) && number.length > 0) {
		number = number.padStart($gameStore.settings.digitCount, '0');
	}
	
	const { digitCount } = $gameStore.settings;
	const validation = validateGuess(number, digitCount);
	if (!validation.valid) {
		const { problem } = validation;
		feedback = (t) => t.validation[problem](digitCount);
		return;
	}
	
	feedback = null;
	gameStore.savePlayerSetup(name, number);
	playerNameInput = '';
	playerNumberInput = '';
	secretVisible = false;
}

async function playAgain() {
	feedback = null;
	gameStore.startNewGame();
	await tick();
	nameField?.focus();
}

function makeMultiPlayerGuess() {
	if ($gameStore.gamePhase !== 'guessing') return;
	
	let guess = multiGuessInput.trim();

	if (!guess) {
		feedback = (t) => t.multi.empty;
		return;
	}
	
	// Pad with leading zeros if needed
	if (guess.length < $gameStore.settings.digitCount && !isNaN(Number(guess))) {
		guess = guess.padStart($gameStore.settings.digitCount, '0');
	}
	
	const { digitCount } = $gameStore.settings;
	const validation = validateGuess(guess, digitCount);
	if (!validation.valid) {
		const { problem } = validation;
		feedback = (t) => t.validation[problem](digitCount);
		return;
	}
	
	feedback = null;
	const targetPlayer = $gameStore.players[targetPlayerIndex];
	const isCorrect = guess === targetPlayer.number;
	const score = calculateFeedback(guess, targetPlayer.number);
	
	const guessEntry: GuessEntry = {
		guesser: $gameStore.currentGuesser,
		target: targetPlayerIndex,
		guess,
		correct: isCorrect,
		correctDigits: score.correctDigits,
		correctPositions: score.correctPositions
	};
	
	gameStore.addMultiPlayerGuess(guessEntry);
	
	// Clear input immediately after adding guess
	multiGuessInput = '';
	
	if (!isCorrect && $gameStore.activePlayers.length > 1) {
		gameStore.nextGuesser();
	}
}

function handleSetupKeyPress(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		savePlayerSetup();
	}
}

function handleGuessKeyPress(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		makeMultiPlayerGuess();
	}
}

function handleSecretInput(event: Event) {
	const input = event.currentTarget as HTMLInputElement
	playerNumberInput = sanitizeDigits(
		input.value,
		$gameStore.settings.digitCount,
	)
	input.value = playerNumberInput
}

function handleMultiGuessInput(event: Event) {
	const input = event.currentTarget as HTMLInputElement
	multiGuessInput = sanitizeDigits(
		input.value,
		$gameStore.settings.digitCount,
	)
	input.value = multiGuessInput
}
</script>

{#if $gameStore.gamePhase === 'setup'}
<header class="mb-6 space-y-1 text-center">
	<h2 class="font-display text-2xl font-bold">{t.multi.setupHeading}</h2>
	<p class="text-[var(--glass-muted)]">{t.multi.setupHint}</p>
</header>
	
<p class="banner banner-info mb-5 text-center font-semibold">
	{t.multi.setupTurn(playerName($gameStore.currentSetupPlayer))}
</p>

{#if feedback}
	<p role="alert" class="banner banner-warning mb-5 text-center">{feedback(t)}</p>
{/if}
	
<div class="surface-translucent mx-auto max-w-md space-y-4 rounded-2xl border-[1.5px] border-[var(--glass-border)] p-5">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
		<label for="player-name-input" class="shrink-0 font-semibold sm:w-24 sm:text-right">{t.multi.nameLabel}</label>
		<input
			id="player-name-input"
			type="text"
			bind:this={nameField}
			bind:value={playerNameInput}
			placeholder={t.multi.namePlaceholder}
			maxlength="20"
			class="field-input min-w-0 sm:flex-1"
		/>
	</div>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
		<label for="player-number-input" class="shrink-0 font-semibold sm:w-24 sm:text-right">{t.multi.secretLabel}</label>
		<div class="flex min-w-0 gap-2 sm:flex-1">
			<!-- Masked because the device is passed between players. -->
			<input
				id="player-number-input"
				type={secretVisible ? 'text' : 'password'}
				value={playerNumberInput}
				oninput={handleSecretInput}
				onkeypress={handleSetupKeyPress}
				placeholder={t.multi.secretPlaceholder}
				inputmode="numeric"
				pattern="[0-9]*"
				autocomplete="off"
				class="field-input min-w-0 flex-1"
			/>
			<button
				type="button"
				class="btn-secondary btn-icon !min-h-14 shrink-0"
				aria-label={secretVisible ? t.multi.hideSecret : t.multi.showSecret}
				aria-controls="player-number-input"
				aria-pressed={secretVisible}
				title={secretVisible ? t.multi.hideSecret : t.multi.showSecret}
				onclick={() => (secretVisible = !secretVisible)}
			>
				{#if secretVisible}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6" />
						<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
					</svg>
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
	<div class="text-center">
		<button onclick={savePlayerSetup} class="btn-primary">
			{t.multi.save}
		</button>
	</div>
</div>
{:else if $gameStore.gamePhase === 'guessing' || $gameStore.gamePhase === 'finished'}
<header class="mb-6 space-y-1 text-center {$gameStore.gamePhase === 'finished' ? 'banner banner-correct' : ''}">
	<h2 class="font-display text-2xl font-bold">{$gameStore.gamePhase === 'finished' ? t.multi.gameOver : t.multi.guessingPhase}</h2>
	<p aria-live="polite" class="text-[var(--glass-muted)]">{$gameStore.gamePhase === 'finished' ? t.multi.wins(playerName($gameStore.activePlayers[0])) : t.multi.turnToGuess(playerName($gameStore.currentGuesser))}</p>
	{#if $gameStore.gamePhase === 'finished'}
		<button type="button" class="btn-primary mt-3" onclick={playAgain}>{t.multi.playAgain}</button>
	{/if}
</header>

{#if feedback}
	<p role="alert" class="banner banner-warning mb-5 text-center">{feedback(t)}</p>
{/if}
	
<div class="my-5">
	<div class="flex flex-wrap justify-center gap-4">
		{#each $gameStore.players as player, index}
		<div
			role="group"
			aria-label={player.eliminated ? t.multi.eliminatedLabel(playerName(index)) : playerName(index)}
			class="player-card player-accent-{playerAccents[index % playerAccents.length]} min-w-[200px] max-w-[250px] flex-1 rounded-2xl p-3 {index === $gameStore.currentGuesser && !player.eliminated && $gameStore.gamePhase === 'guessing' ? 'player-card-turn' : ''} {player.eliminated ? 'player-card-eliminated' : ''}"
		>
			<div class="player-card-name flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-display text-lg font-bold">
				<span>{playerName(index)}</span>
				{#if player.eliminated}
					<span class="text-[0.8125rem]">{t.multi.eliminated}</span>
				{/if}
			</div>
			<div class="mt-3 max-h-52 space-y-1 overflow-y-auto">
				{#each [...player.guesses].reverse() as guess, guessIndex}
				<div class="history-row px-2 py-1.5 text-sm {guessIndex === 0 ? 'history-row-newest' : ''} {guess.correct ? 'history-row-correct font-bold' : ''}">
					<div class="flex w-full flex-wrap justify-between gap-x-2">
						<span class="whitespace-nowrap">{playerName(guess.guesser)}: {guess.guess}</span>
						<span class="whitespace-nowrap">{guess.correct ? t.multi.correct : t.multi.score(guess.correctDigits, guess.correctPositions)}</span>
					</div>
				</div>
				{/each}
			</div>
		</div>
		{/each}
	</div>
</div>
	
{#if $gameStore.gamePhase === 'guessing'}
	<div class="surface-translucent my-5 flex flex-wrap items-center justify-center gap-4 rounded-2xl border-[1.5px] border-[var(--glass-border)] p-4">
		<div class="flex items-center gap-2">
			<label for="target-player" class="font-semibold">{t.multi.guessFor}</label>
			<select
				id="target-player"
				bind:value={targetPlayerIndex}
				class="field-select"
			>
				{#each $gameStore.activePlayers as playerIdx}
					{#if playerIdx !== $gameStore.currentGuesser}
						<option value={playerIdx}>{playerName(playerIdx)}</option>
					{/if}
				{/each}
			</select>
		</div>
		<div class="flex flex-wrap justify-center gap-2">
			<label for="multiplayer-guess" class="sr-only">{t.multi.guessLabel}</label>
			<input
				id="multiplayer-guess"
				type="text"
				value={multiGuessInput}
				oninput={handleMultiGuessInput}
				onkeypress={handleGuessKeyPress}
				placeholder={t.multi.guessPlaceholder}
				inputmode="numeric"
				pattern="[0-9]*"
				class="field-input w-40"
			/>
			<button
				onclick={makeMultiPlayerGuess}
				class="btn-primary"
			>
				{t.multi.submit}
			</button>
		</div>
	</div>
{/if}
{/if}

<style>
	.player-card {
		background: var(--surface-white);
		border: 1.5px solid var(--stage-border);
	}

	.player-card-turn {
		box-shadow: inset 0 0 0 3px var(--accent-purple);
	}

	.player-card-eliminated {
		background: color-mix(in srgb, var(--state-incorrect) 12%, var(--surface-white));
		opacity: 0.75;
	}

	.player-card-name {
		background: var(--player-accent);
		color: var(--player-accent-fg);
	}

	.player-accent-blue {
		--player-accent: var(--accent-blue);
		--player-accent-fg: var(--accent-blue-fg);
	}

	.player-accent-yellow {
		--player-accent: var(--accent-yellow);
		--player-accent-fg: var(--accent-yellow-fg);
	}

	.player-accent-orange {
		--player-accent: var(--accent-orange);
		--player-accent-fg: var(--accent-orange-fg);
	}

	.player-accent-green {
		--player-accent: var(--accent-green);
		--player-accent-fg: var(--accent-green-fg);
	}
</style>

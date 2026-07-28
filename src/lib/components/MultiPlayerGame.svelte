<script lang="ts">
import { gameStore, validateGuess, calculateFeedback, type GuessEntry } from '$lib/stores/gameStore';
	
const playerAccents = ['blue', 'yellow', 'orange', 'green'];
	
let playerNameInput = $state('');
let playerNumberInput = $state('');
let multiGuessInput = $state('');
let targetPlayerIndex = $state(0);
let feedbackMessage = $state('');
	
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
	let name = playerNameInput.trim();
	let number = playerNumberInput.trim();
	
	if (!name) {
		name = `Player ${$gameStore.currentSetupPlayer + 1}`;
	}
	
	if (!number) {
		feedbackMessage = 'Please enter a secret number.';
		return;
	}
	
	// Pad with leading zeros if needed
	if (number.length < $gameStore.settings.digitCount && !isNaN(Number(number)) && number.length > 0) {
		number = number.padStart($gameStore.settings.digitCount, '0');
	}
	
	const validation = validateGuess(number, $gameStore.settings.digitCount);
	if (!validation.valid) {
		feedbackMessage = validation.message;
		return;
	}
	
	feedbackMessage = '';
	gameStore.savePlayerSetup(name, number);
	playerNameInput = '';
	playerNumberInput = '';
}

function makeMultiPlayerGuess() {
	if ($gameStore.gamePhase !== 'guessing') return;
	
	let guess = multiGuessInput.trim();
	
	// Pad with leading zeros if needed
	if (guess.length < $gameStore.settings.digitCount && !isNaN(Number(guess))) {
		guess = guess.padStart($gameStore.settings.digitCount, '0');
	}
	
	const validation = validateGuess(guess, $gameStore.settings.digitCount);
	if (!validation.valid) {
		feedbackMessage = validation.message;
		return;
	}
	
	feedbackMessage = '';
	const targetPlayer = $gameStore.players[targetPlayerIndex];
	const isCorrect = guess === targetPlayer.number;
	const feedback = calculateFeedback(guess, targetPlayer.number);
	
	const guessEntry: GuessEntry = {
		guesser: $gameStore.currentGuesser,
		target: targetPlayerIndex,
		guess,
		correct: isCorrect,
		correctDigits: feedback.correctDigits,
		correctPositions: feedback.correctPositions
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
</script>

{#if $gameStore.gamePhase === 'setup'}
<header class="mb-6 space-y-1 text-center">
	<h2 class="font-display text-2xl font-bold">Player Setup</h2>
	<p class="text-[var(--glass-muted)]">Enter your name and secret number</p>
</header>
	
<p class="banner banner-info mb-5 text-center font-semibold">
	{$gameStore.players[$gameStore.currentSetupPlayer]?.name}'s turn to setup
</p>

{#if feedbackMessage}
	<p role="alert" class="banner banner-warning mb-5 text-center">{feedbackMessage}</p>
{/if}
	
<div class="surface-translucent mx-auto max-w-md space-y-4 rounded-2xl border-[1.5px] border-[var(--glass-border)] p-5">
	<div class="flex items-center gap-3">
		<label for="player-name-input" class="w-24 shrink-0 text-right font-semibold">Name:</label>
		<input
			id="player-name-input"
			type="text"
			bind:value={playerNameInput}
			placeholder="Enter your name"
			maxlength="20"
			class="field-input min-w-0 flex-1"
		/>
	</div>
	<div class="flex items-center gap-3">
		<label for="player-number-input" class="w-24 shrink-0 text-right font-semibold">Secret Number:</label>
		<input
			id="player-number-input"
			type="text"
			bind:value={playerNumberInput}
			onkeypress={handleSetupKeyPress}
			placeholder="Enter your secret number"
			maxlength={$gameStore.settings.digitCount}
			pattern="[0-9]*"
			class="field-input min-w-0 flex-1"
		/>
	</div>
	<div class="text-center">
		<button onclick={savePlayerSetup} class="btn-primary">
			Save & Continue
		</button>
	</div>
</div>
{:else if $gameStore.gamePhase === 'guessing' || $gameStore.gamePhase === 'finished'}
<header class="mb-6 space-y-1 text-center {$gameStore.gamePhase === 'finished' ? 'banner banner-correct' : ''}">
	<h2 class="font-display text-2xl font-bold">{$gameStore.gamePhase === 'finished' ? 'Game Over!' : 'Guessing Phase'}</h2>
	<p aria-live="polite" class="text-[var(--glass-muted)]">{$gameStore.gamePhase === 'finished' ? `${$gameStore.players[$gameStore.activePlayers[0]]?.name} wins!` : `${$gameStore.players[$gameStore.currentGuesser]?.name}'s turn to guess`}</p>
</header>

{#if feedbackMessage}
	<p role="alert" class="banner banner-warning mb-5 text-center">{feedbackMessage}</p>
{/if}
	
<div class="my-5">
	<div class="flex flex-wrap justify-center gap-4">
		{#each $gameStore.players as player, index}
		<div
			role="group"
			aria-label={`${player.name}${player.eliminated ? ' eliminated' : ''}`}
			class="player-card player-accent-{playerAccents[index % playerAccents.length]} min-w-[200px] max-w-[250px] flex-1 rounded-2xl p-3 {index === $gameStore.currentGuesser && !player.eliminated && $gameStore.gamePhase === 'guessing' ? 'player-card-turn' : ''} {player.eliminated ? 'player-card-eliminated' : ''}"
		>
			<div class="player-card-name flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-display text-lg font-bold">
				<span>{player.name}</span>
				{#if player.eliminated}
					<span class="text-[0.8125rem]">Eliminated</span>
				{/if}
			</div>
			<div class="mt-3 max-h-52 space-y-1 overflow-y-auto">
				{#each player.guesses as guess, guessIndex}
				<div class="history-row px-2 py-1.5 text-sm {guessIndex === player.guesses.length - 1 ? 'history-row-newest' : ''} {guess.correct ? 'history-row-correct font-bold' : ''}">
					<div class="flex w-full justify-between gap-2">
						<span>{$gameStore.players[guess.guesser]?.name}: {guess.guess}</span>
						<span>{guess.correct ? 'CORRECT!' : `D:${guess.correctDigits}, P:${guess.correctPositions}`}</span>
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
			<label for="target-player" class="font-semibold">Guess for:</label>
			<select
				id="target-player"
				bind:value={targetPlayerIndex}
				class="field-select"
			>
				{#each $gameStore.activePlayers as playerIdx}
					{#if playerIdx !== $gameStore.currentGuesser}
						<option value={playerIdx}>{$gameStore.players[playerIdx]?.name}</option>
					{/if}
				{/each}
			</select>
		</div>
		<div class="flex flex-wrap justify-center gap-2">
			<label for="multiplayer-guess" class="sr-only">Guess</label>
			<input
				id="multiplayer-guess"
				type="text"
				bind:value={multiGuessInput}
				onkeypress={handleGuessKeyPress}
				placeholder="Enter guess"
				maxlength={$gameStore.settings.digitCount}
				pattern="[0-9]*"
				class="field-input w-40"
			/>
			<button
				onclick={makeMultiPlayerGuess}
				class="btn-primary"
			>
				Submit Guess
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

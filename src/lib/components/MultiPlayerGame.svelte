<script lang="ts">
import { gameStore, validateGuess, calculateFeedback, type GuessEntry } from '$lib/stores/gameStore';
	
let playerNameInput = $state('');
let playerNumberInput = $state('');
let multiGuessInput = $state('');
let targetPlayerIndex = $state(0);
	
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
		alert('Please enter a secret number.');
		return;
	}
	
	// Pad with leading zeros if needed
	if (number.length < $gameStore.settings.digitCount && !isNaN(Number(number)) && number.length > 0) {
		number = number.padStart($gameStore.settings.digitCount, '0');
	}
	
	const validation = validateGuess(number, $gameStore.settings.digitCount);
	if (!validation.valid) {
		alert(validation.message);
		return;
	}
	
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
		alert(validation.message);
		return;
	}
	
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
<div class="phase-header text-center mb-6 p-5 rounded-xl border backdrop-blur-md bg-white/10 border-white/30 shadow-lg">
	<h3 class="text-white mb-2 text-xl font-semibold drop-shadow-lg">Player Setup</h3>
	<p class="text-white/90 m-0">Enter your name and secret number</p>
</div>
	
<div class="current-player-info text-center text-xl font-bold text-white mb-5 p-4 rounded-xl backdrop-blur-md bg-blue-400/30 border border-white/30 shadow-lg drop-shadow-lg">
	{$gameStore.players[$gameStore.currentSetupPlayer]?.name}'s turn to setup
</div>
	
<div class="max-w-md mx-auto p-5 rounded-xl border-2 backdrop-blur-md bg-white/10 border-white/30 shadow-lg">
	<div class="flex items-center mb-4 gap-4">
		<label for="player-name-input" class="font-bold text-white min-w-[120px] text-right drop-shadow-lg">Name:</label>
		<input
			id="player-name-input"
			type="text"
			bind:value={playerNameInput}
			placeholder="Enter your name"
			maxlength="20"
			class="flex-1 px-3 py-2 rounded-xl text-lg text-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white placeholder-white/60 font-semibold shadow-lg"
		/>
	</div>
	<div class="flex items-center mb-4 gap-4">
		<label for="player-number-input" class="font-bold text-white min-w-[120px] text-right drop-shadow-lg">Secret Number:</label>
		<input
			id="player-number-input"
			type="text"
			bind:value={playerNumberInput}
			onkeypress={handleSetupKeyPress}
			placeholder="Enter your secret number"
			maxlength={$gameStore.settings.digitCount}
			pattern="[0-9]*"
			class="flex-1 px-3 py-2 rounded-xl text-lg text-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white placeholder-white/60 font-semibold shadow-lg"
		/>
	</div>
	<div class="flex gap-2 justify-center">
		<button
			onclick={savePlayerSetup}
			class="px-5 py-3 rounded-xl text-lg text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-white/30"
		>
			Save & Continue
		</button>
	</div>
</div>
{:else if $gameStore.gamePhase === 'guessing' || $gameStore.gamePhase === 'finished'}
<div class="phase-header text-center mb-6 p-5 rounded-xl border backdrop-blur-md bg-white/10 border-white/30 shadow-lg">
	<h3 class="text-white mb-2 text-xl font-semibold drop-shadow-lg">{$gameStore.gamePhase === 'finished' ? 'Game Over!' : 'Guessing Phase'}</h3>
	<p class="text-white/90 m-0">{$gameStore.gamePhase === 'finished' ? `${$gameStore.players[$gameStore.activePlayers[0]]?.name} wins!` : `${$gameStore.players[$gameStore.currentGuesser]?.name}'s turn to guess`}</p>
</div>
	
<div class="my-5">
	<div class="flex gap-4 justify-center flex-wrap">
		{#each $gameStore.players as player, index}
		<div class="flex-1 min-w-[200px] max-w-[250px] rounded-xl p-4 shadow-lg backdrop-blur-md border-2 {player.eliminated ? 'bg-red-400/20 border-red-300/50 opacity-70' : 'bg-white/20 border-white/30'} {index === $gameStore.currentGuesser && !player.eliminated && $gameStore.gamePhase === 'guessing' ? 'ring-4 ring-purple-300/50' : ''}">
			<div class="text-center font-bold text-lg mb-4 p-2 rounded-lg backdrop-blur-md {index === $gameStore.currentGuesser && !player.eliminated && $gameStore.gamePhase === 'guessing' ? 'bg-purple-500/40 text-white border border-purple-300/50' : player.eliminated ? 'bg-red-500/40 text-white border border-red-300/50' : 'bg-white/20 text-white border border-white/30'} shadow-md">
				{player.name}
			</div>
			<div class="max-h-52 overflow-y-auto space-y-1">
				{#each player.guesses as guess}
				<div class="p-2 my-1 rounded-lg text-sm backdrop-blur-md shadow-md {guess.correct ? 'bg-green-400/30 text-white font-bold border border-green-300/50' : 'bg-white/20 text-white border border-white/30'}">
					<div class="flex justify-between w-full">
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
	
{#if $gameStore.gamePhase === 'guessing' || $gameStore.gamePhase === 'finished'}
	<div class="flex gap-4 items-center justify-center flex-wrap my-5 p-5 rounded-xl backdrop-blur-md bg-white/10 border border-white/30 shadow-lg">
		<div class="flex items-center gap-2">
			<label for="target-player" class="font-bold text-white drop-shadow-lg">Guess for:</label>
			<select
				id="target-player"
				bind:value={targetPlayerIndex}
				disabled={$gameStore.gamePhase === 'finished'}
				class="px-3 py-2 rounded-lg text-base cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#each $gameStore.activePlayers as playerIdx}
					{#if playerIdx !== $gameStore.currentGuesser}
						<option value={playerIdx}>{$gameStore.players[playerIdx]?.name}</option>
					{/if}
				{/each}
			</select>
		</div>
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={multiGuessInput}
				onkeypress={handleGuessKeyPress}
				placeholder="Enter guess"
				maxlength={$gameStore.settings.digitCount}
				pattern="[0-9]*"
				disabled={$gameStore.gamePhase === 'finished'}
				class="px-4 py-2 rounded-xl text-lg w-52 text-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white placeholder-white/60 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
			/>
			<button
				onclick={makeMultiPlayerGuess}
				disabled={$gameStore.gamePhase === 'finished'}
				class="px-5 py-2 rounded-xl text-lg text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
			>
				Submit Guess
			</button>
		</div>
	</div>
{/if}
{:else if $gameStore.gamePhase === 'setup'}
<div class="text-center p-8 rounded-2xl my-5 backdrop-blur-md bg-gradient-to-r from-green-400/40 to-teal-500/40 border-2 border-white/30 text-white shadow-2xl">
	<h3 class="text-3xl mb-4 font-bold drop-shadow-lg">Game Over!</h3>
	<div class="text-2xl font-bold drop-shadow-lg">
		🎉 {$gameStore.players[$gameStore.activePlayers[0]]?.name} wins! 🎉
	</div>
</div>
{/if}
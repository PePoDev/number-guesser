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
		
		if (!isCorrect && $gameStore.activePlayers.length > 1) {
			gameStore.nextGuesser();
		}
		
		multiGuessInput = '';
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
	<div class="phase-header text-center mb-6 p-5 bg-gray-50 rounded-lg border-l-4 border-purple-600">
		<h3 class="text-gray-800 mb-2 text-xl font-semibold">Player Setup</h3>
		<p class="text-gray-600 m-0">Enter your name and secret number</p>
	</div>
	
	<div class="current-player-info text-center text-xl font-bold text-purple-600 mb-5 p-4 bg-blue-50 rounded-lg">
		{$gameStore.players[$gameStore.currentSetupPlayer]?.name}'s turn to setup
	</div>
	
	<div class="max-w-md mx-auto p-5 bg-gray-50 rounded-lg border-2 border-gray-200">
		<div class="flex items-center mb-4 gap-4">
			<label for="player-name-input" class="font-bold text-gray-700 min-w-[120px] text-right">Name:</label>
			<input
				id="player-name-input"
				type="text"
				bind:value={playerNameInput}
				placeholder="Enter your name"
				maxlength="20"
				class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-lg text-center transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
			/>
		</div>
		<div class="flex items-center mb-4 gap-4">
			<label for="player-number-input" class="font-bold text-gray-700 min-w-[120px] text-right">Secret Number:</label>
			<input
				id="player-number-input"
				type="text"
				bind:value={playerNumberInput}
				onkeypress={handleSetupKeyPress}
				placeholder="Enter your secret number"
				maxlength={$gameStore.settings.digitCount}
				pattern="[0-9]*"
				class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-lg text-center transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
			/>
		</div>
		<div class="flex gap-2 justify-center">
			<button
				onclick={savePlayerSetup}
				class="px-5 py-3 bg-purple-600 text-white rounded-lg text-lg hover:bg-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
			>
				Save & Continue
			</button>
		</div>
	</div>
{:else if $gameStore.gamePhase === 'guessing'}
	<div class="phase-header text-center mb-6 p-5 bg-gray-50 rounded-lg border-l-4 border-purple-600">
		<h3 class="text-gray-800 mb-2 text-xl font-semibold">Guessing Phase</h3>
		<p class="text-gray-600 m-0">{$gameStore.players[$gameStore.currentGuesser]?.name}'s turn to guess</p>
	</div>
	
	<div class="my-5">
		<div class="flex gap-4 justify-center flex-wrap">
			{#each $gameStore.players as player, index}
				<div class="flex-1 min-w-[200px] max-w-[250px] bg-white border-2 rounded-lg p-4 shadow-md {player.eliminated ? 'bg-red-50 border-red-200 opacity-70' : 'border-gray-300'} {index === $gameStore.currentGuesser && !player.eliminated ? 'ring-4 ring-purple-300' : ''}">
					<div class="text-center font-bold text-lg mb-4 p-2 rounded {index === $gameStore.currentGuesser && !player.eliminated ? 'bg-purple-600 text-white' : player.eliminated ? 'bg-red-600 text-white' : 'bg-gray-200'}">
						{player.name}
					</div>
					<div class="max-h-52 overflow-y-auto space-y-1">
						{#each player.guesses as guess}
							<div class="p-2 my-1 rounded text-sm {guess.correct ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100'}">
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
	
	<div class="flex gap-4 items-center justify-center flex-wrap my-5 p-5 bg-gray-50 rounded-lg">
		<div class="flex items-center gap-2">
			<label for="target-player" class="font-bold text-gray-700">Guess for:</label>
			<select
				id="target-player"
				bind:value={targetPlayerIndex}
				class="px-3 py-2 border-2 border-gray-300 rounded text-base bg-white cursor-pointer transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
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
				class="px-4 py-2 border-2 border-gray-300 rounded-lg text-lg w-52 text-center transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
			/>
			<button
				onclick={makeMultiPlayerGuess}
				class="px-5 py-2 bg-purple-600 text-white rounded-lg text-lg hover:bg-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
			>
				Submit Guess
			</button>
		</div>
	</div>
{:else if $gameStore.gamePhase === 'finished'}
	<div class="text-center p-8 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-2xl my-5">
		<h3 class="text-3xl mb-4">Game Over!</h3>
		<div class="text-2xl font-bold">
			🎉 {$gameStore.players[$gameStore.activePlayers[0]]?.name} wins! 🎉
		</div>
	</div>
{/if}
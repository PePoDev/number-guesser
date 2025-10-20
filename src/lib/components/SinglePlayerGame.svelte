<script lang="ts">
	import { gameStore, validateGuess, calculateFeedback } from '$lib/stores/gameStore';
	
	let guessInput = $state('');
	let currentGuess = $state('');
	let feedbackMessage = $state('');
	let feedbackType = $state<'correct' | 'incorrect' | 'warning'>('incorrect');
	let winMessage = $state('');
	let loseMessage = $state('');
	
	function makeGuess() {
		if ($gameStore.gameOver) return;
		
		let guess = guessInput.trim();
		
		// Check for empty input
		if (guess === '') {
			feedbackMessage = 'Please enter a number before submitting.';
			feedbackType = 'warning';
			return;
		}
		
		// Check if input length matches required digit count
		if (guess.length !== $gameStore.settings.digitCount) {
			feedbackMessage = `Please enter exactly ${$gameStore.settings.digitCount} digits.`;
			feedbackType = 'warning';
			return;
		}
		
		// Validate the guess (no padding needed since length is already checked)
		const validation = validateGuess(guess, $gameStore.settings.digitCount);
		if (!validation.valid) {
			feedbackMessage = validation.message;
			feedbackType = 'warning';
			return;
		}
		
		// Check for duplicate guess
		const isDuplicate = $gameStore.guessHistory.some(entry => entry.guess === guess);
		if (isDuplicate) {
			feedbackMessage = `You've already guessed ${guess}. Try a different number!`;
			feedbackType = 'warning';
			return;
		}
		
		// Calculate feedback
		const feedback = calculateFeedback(guess, $gameStore.targetNumber);
		
		// Add to history
		gameStore.addGuess({
			guess,
			correctDigits: feedback.correctDigits,
			correctPositions: feedback.correctPositions
		});
		
		// Display current guess
		currentGuess = `Your guess: ${guess}`;
		
		// Check if player won
		if (feedback.correctPositions === $gameStore.settings.digitCount) {
			const attemptsUsed = $gameStore.settings.maxAttempts - $gameStore.attemptsLeft;
			winMessage = `🎉 Congratulations! You guessed the number ${$gameStore.targetNumber} correctly!<br>You won with ${attemptsUsed} attempt${attemptsUsed === 1 ? '' : 's'}!`;
			feedbackMessage = 'Perfect! All digits in correct positions!';
			feedbackType = 'correct';
			gameStore.setGameOver(true);
			return;
		}
		
		// Check if player lost
		if ($gameStore.attemptsLeft === 0) {
			loseMessage = `Game Over! You've used all your attempts. The correct number was: <strong>${$gameStore.targetNumber}</strong>`;
			feedbackMessage = 'Better luck next time!';
			feedbackType = 'incorrect';
			gameStore.setGameOver(true);
			return;
		}
		
		// Show feedback
		feedbackMessage = `Correct digits: ${feedback.correctDigits}, Correct positions: ${feedback.correctPositions}`;
		feedbackType = 'incorrect';
		
		// Clear input
		guessInput = '';
	}
	
	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			makeGuess();
		}
	}
</script>

<div class="game-area">
	<div class="flex gap-2 mb-5 justify-center">
		<input
			type="text"
			bind:value={guessInput}
			onkeypress={handleKeyPress}
			placeholder="Enter number"
			maxlength={$gameStore.settings.digitCount}
			pattern="[0-9]*"
			disabled={$gameStore.gameOver}
			class="px-4 py-3 rounded-xl text-lg w-52 text-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 disabled:cursor-not-allowed backdrop-blur-md bg-white/20 border border-white/30 text-white placeholder-white/60 font-semibold shadow-lg disabled:opacity-50"
		/>
		<button
			onclick={makeGuess}
			disabled={$gameStore.gameOver}
			class="px-5 py-3 rounded-xl text-lg text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg disabled:cursor-not-allowed disabled:transform-none backdrop-blur-md bg-gradient-to-r from-purple-400/30 to-pink-500/30 border border-white/30 disabled:opacity-50"
		>
			Submit Guess
		</button>
	</div>
	
	<div class="my-5 text-center">
		{#if currentGuess}
			<div class="text-xl font-bold text-white mb-2 drop-shadow-lg">{currentGuess}</div>
		{/if}
	</div>
	
	{#if feedbackMessage}
		<div class="text-lg p-4 rounded-xl my-2 backdrop-blur-md border shadow-lg text-center {feedbackType === 'correct' ? 'bg-green-400/30 text-white border-green-300/50' : feedbackType === 'warning' ? 'bg-yellow-400/30 text-white border-yellow-300/50' : 'bg-red-400/30 text-white border-red-300/50'}">
			{feedbackMessage}
		</div>
	{/if}
	
	{#if winMessage}
		<div class="backdrop-blur-md bg-green-400/30 text-white border-2 border-green-300/50 p-5 rounded-xl text-center text-xl font-bold my-5 shadow-lg">
			{@html winMessage}
		</div>
	{/if}
	
	{#if loseMessage}
		<div class="backdrop-blur-md bg-red-400/30 text-white border-2 border-red-300/50 p-5 rounded-xl text-center text-xl font-bold my-5 shadow-lg">
			{@html loseMessage}
		</div>
	{/if}
	
	<div class="mt-8">
		<h3 class="text-white mb-4 text-center font-semibold text-lg drop-shadow-lg">Guess History:</h3>
		<div class="max-h-52 overflow-y-auto rounded-xl p-2 backdrop-blur-md bg-white/10 border border-white/30 shadow-lg">
			{#each $gameStore.guessHistory as entry, index}
				<div class="flex justify-between items-center p-2 my-1 rounded-lg border-l-4 backdrop-blur-md bg-white/20 border-purple-400/50 shadow-md">
					<span class="font-bold text-lg text-white">Guess {index + 1}: {entry.guess}</span>
					<span class="text-sm text-white/90">Digits: {entry.correctDigits}, Positions: {entry.correctPositions}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
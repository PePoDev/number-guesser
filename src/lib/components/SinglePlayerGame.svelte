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
			loseMessage = `😞 Game Over! You've used all your attempts.<br>The correct number was: <strong>${$gameStore.targetNumber}</strong>`;
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
			class="px-4 py-3 border-2 border-gray-300 rounded-lg text-lg w-52 text-center transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
		/>
		<button
			onclick={makeGuess}
			disabled={$gameStore.gameOver}
			class="px-5 py-3 bg-purple-600 text-white rounded-lg text-lg hover:bg-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
		>
			Submit Guess
		</button>
	</div>
	
	<div class="my-5 text-center">
		{#if currentGuess}
			<div class="text-xl font-bold text-gray-800 mb-2">{currentGuess}</div>
		{/if}
		{#if feedbackMessage}
			<div class="text-lg p-4 rounded-lg my-2 {feedbackType === 'correct' ? 'bg-green-100 text-green-800 border border-green-300' : feedbackType === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-red-100 text-red-800 border border-red-300'}">
				{feedbackMessage}
			</div>
		{/if}
	</div>
	
	{#if winMessage}
		<div class="bg-green-100 text-green-800 border-2 border-green-300 p-5 rounded-lg text-center text-xl font-bold my-5">
			{@html winMessage}
		</div>
	{/if}
	
	{#if loseMessage}
		<div class="bg-red-100 text-red-800 border-2 border-red-300 p-5 rounded-lg text-center text-xl font-bold my-5">
			{@html loseMessage}
		</div>
	{/if}
	
	<div class="mt-8">
		<h3 class="text-gray-800 mb-4 text-center font-semibold">Guess History:</h3>
		<div class="max-h-52 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-gray-50">
			{#each $gameStore.guessHistory as entry, index}
				<div class="flex justify-between items-center p-2 my-1 bg-white rounded border-l-4 border-purple-600">
					<span class="font-bold text-lg">Guess {index + 1}: {entry.guess}</span>
					<span class="text-sm text-gray-600">Digits: {entry.correctDigits}, Positions: {entry.correctPositions}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
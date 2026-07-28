<script lang="ts">
	import {
		gameStore,
		validateGuess,
		calculateFeedback,
		sanitizeDigits,
	} from '$lib/stores/gameStore';
	
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
			winMessage = `Congratulations! You guessed the number ${$gameStore.targetNumber} correctly!<br>You won with ${attemptsUsed} attempt${attemptsUsed === 1 ? '' : 's'}!`;
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

	function handleGuessInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		guessInput = sanitizeDigits(
			input.value,
			$gameStore.settings.digitCount,
		)
		input.value = guessInput
	}
</script>

<div class="game-area">
	<div class="mb-5 flex flex-wrap justify-center gap-3">
		<label for="single-player-guess" class="sr-only">Guess</label>
		<input
			id="single-player-guess"
			type="text"
			value={guessInput}
			oninput={handleGuessInput}
			onkeypress={handleKeyPress}
			placeholder="Enter number"
			maxlength={$gameStore.settings.digitCount}
			inputmode="numeric"
			pattern="[0-9]*"
			disabled={$gameStore.gameOver}
			class="field-input w-52 text-lg"
		/>
		<button
			onclick={makeGuess}
			disabled={$gameStore.gameOver}
			class="btn-primary text-lg"
		>
			Submit Guess
		</button>
	</div>
	
	{#if currentGuess}
		<p class="my-4 text-center text-xl font-bold">{currentGuess}</p>
	{/if}
	
	{#if feedbackMessage}
		<div
			role={feedbackType === 'warning' ? 'alert' : 'status'}
			aria-live={feedbackType === 'warning' ? 'assertive' : 'polite'}
			class="banner my-3 text-center {feedbackType === 'correct' ? 'banner-correct' : feedbackType === 'warning' ? 'banner-warning' : 'banner-incorrect'}"
		>
			{feedbackMessage}
		</div>
	{/if}
	
	{#if winMessage}
		<div role="status" aria-live="polite" class="banner banner-correct my-5 p-5 text-center text-xl font-bold">
			{@html winMessage}
		</div>
	{/if}
	
	{#if loseMessage}
		<div role="alert" class="banner banner-incorrect my-5 p-5 text-center text-xl font-bold">
			{@html loseMessage}
		</div>
	{/if}
	
	<div class="mt-8">
		<h3 class="mb-4 text-center font-display text-lg font-bold">Guess History:</h3>
		<div class="surface-translucent-soft max-h-52 space-y-1 overflow-y-auto rounded-2xl border-[1.5px] border-[var(--glass-border)] p-2">
			{#each $gameStore.guessHistory as entry, index}
				<div class="history-row flex items-center justify-between px-3 py-2 {index === $gameStore.guessHistory.length - 1 ? 'history-row-newest' : ''}">
					<span class="font-bold">Guess {index + 1}: {entry.guess}</span>
					<span class="text-sm text-[var(--glass-muted)]">Digits: {entry.correctDigits}, Positions: {entry.correctPositions}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

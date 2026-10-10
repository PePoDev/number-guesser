<script lang="ts">
	import { tick } from 'svelte'
	import {
		gameStore,
		validateGuess,
		calculateFeedback,
		sanitizeDigits,
		type SinglePlayerGuess,
	} from '$lib/stores/gameStore'

	let guessInput = $state('')
	let guessField = $state<HTMLInputElement>()
	let resultPanel = $state<HTMLDivElement>()
	// Every guess and new game replaces the history array, so a warning tagged
	// with the array it was raised against disappears on its own afterwards.
	let warning = $state.raw({ message: '', round: $gameStore.guessHistory })

	const warningMessage = $derived(
		warning.round === $gameStore.guessHistory ? warning.message : '',
	)
	const latestGuess = $derived<SinglePlayerGuess | undefined>(
		$gameStore.guessHistory[$gameStore.guessHistory.length - 1],
	)
	const won = $derived(
		$gameStore.gameOver &&
			latestGuess?.correctPositions === $gameStore.settings.digitCount,
	)
	const result = $derived.by(() => {
		if (!latestGuess) return undefined
		if (won) {
			return { message: 'Perfect! All digits in correct positions!', tone: 'correct' }
		}
		if ($gameStore.gameOver) {
			return { message: 'Better luck next time!', tone: 'incorrect' }
		}
		return {
			message: `Correct digits: ${latestGuess.correctDigits}, Correct positions: ${latestGuess.correctPositions}`,
			tone: 'info',
		}
	})
	const attemptsUsed = $derived($gameStore.guessHistory.length)
	const newestFirst = $derived(
		$gameStore.guessHistory
			.map((entry, index) => ({ ...entry, number: index + 1 }))
			.reverse(),
	)

	function warn(message: string) {
		warning = { message, round: $gameStore.guessHistory }
	}

	function makeGuess() {
		if ($gameStore.gameOver) return

		const guess = guessInput.trim()
		const { digitCount } = $gameStore.settings

		if (guess === '') {
			warn('Please enter a number before submitting.')
			return
		}

		if (guess.length !== digitCount) {
			warn(`Please enter exactly ${digitCount} digits.`)
			return
		}

		const validation = validateGuess(guess, digitCount)
		if (!validation.valid) {
			warn(validation.message)
			return
		}

		if ($gameStore.guessHistory.some((entry) => entry.guess === guess)) {
			warn(`You've already guessed ${guess}. Try a different number!`)
			return
		}

		const feedback = calculateFeedback(guess, $gameStore.targetNumber)
		gameStore.addGuess({
			guess,
			correctDigits: feedback.correctDigits,
			correctPositions: feedback.correctPositions,
		})
		guessInput = ''

		if (feedback.correctPositions === digitCount || $gameStore.attemptsLeft === 0) {
			gameStore.setGameOver(true)
		}
	}

	async function submitGuess() {
		makeGuess()
		await tick()
		// The guess field is disabled once the game ends, so focus moves to the result.
		if ($gameStore.gameOver) {
			resultPanel?.focus()
		} else {
			guessField?.focus()
		}
	}

	async function playAgain() {
		gameStore.startNewGame()
		await tick()
		guessField?.focus()
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			void submitGuess()
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
	<div class="mb-5 flex flex-wrap gap-3">
		<label for="single-player-guess" class="sr-only">Guess</label>
		<input
			id="single-player-guess"
			type="text"
			bind:this={guessField}
			value={guessInput}
			oninput={handleGuessInput}
			onkeypress={handleKeyPress}
			placeholder="Enter number"
			inputmode="numeric"
			pattern="[0-9]*"
			autocomplete="off"
			enterkeyhint="go"
			disabled={$gameStore.gameOver}
			class="field-input min-w-0 grow basis-32 text-lg tracking-widest tabular-nums placeholder:tracking-normal"
		/>
		<button
			type="button"
			onclick={submitGuess}
			disabled={$gameStore.gameOver}
			class="btn-primary grow text-lg sm:grow-0"
		>
			Submit Guess
		</button>
	</div>

	{#if warningMessage}
		<div role="alert" aria-live="assertive" class="banner banner-warning my-3 text-center">
			{warningMessage}
		</div>
	{:else if result}
		<div role="status" aria-live="polite" class="banner banner-{result.tone} my-3 text-center">
			{result.message}
		</div>
	{/if}

	{#if $gameStore.gameOver && latestGuess}
		<div
			bind:this={resultPanel}
			role={won ? 'status' : 'alert'}
			tabindex="-1"
			class="banner {won ? 'banner-correct' : 'banner-incorrect'} my-5 space-y-4 p-5 text-center"
		>
			{#if won}
				<div class="text-xl font-bold">
					<p>Congratulations! You guessed the number {$gameStore.targetNumber} correctly!</p>
					<p>You won with {attemptsUsed} attempt{attemptsUsed === 1 ? '' : 's'}!</p>
				</div>
			{:else}
				<p class="text-xl font-bold">
					Game Over! You've used all your attempts. The correct number was: <strong>{$gameStore.targetNumber}</strong>
				</p>
			{/if}
			<button type="button" class="btn-primary" onclick={playAgain}>Play again</button>
		</div>
	{/if}

	<section class="mt-8" aria-labelledby="single-player-history">
		<h3 id="single-player-history" class="mb-3 font-display text-lg font-bold">Guess History:</h3>
		<div class="surface-translucent-soft max-h-52 space-y-1 overflow-y-auto rounded-2xl border-[1.5px] border-[var(--glass-border)] p-2">
			{#each newestFirst as entry (entry.number)}
				<div class="history-row flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 {entry.number === attemptsUsed ? 'history-row-newest' : ''}">
					<span class="whitespace-nowrap font-bold tabular-nums">Guess {entry.number}: {entry.guess}</span>
					<span class="whitespace-nowrap text-sm text-[var(--glass-muted)]">Digits: {entry.correctDigits}, Positions: {entry.correctPositions}</span>
				</div>
			{:else}
				<p class="px-3 py-2 text-sm text-[var(--glass-muted)]">
					No guesses yet. Your guesses will appear here.
				</p>
			{/each}
		</div>
	</section>
</div>

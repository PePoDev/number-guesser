<script lang="ts">
	import { tick } from 'svelte'
	import {
		gameStore,
		validateGuess,
		calculateFeedback,
		sanitizeDigits,
		type SinglePlayerGuess,
	} from '$lib/stores/gameStore'
	import { messages, type Messages } from '$lib/i18n/messages'

	let guessInput = $state('')
	let guessField = $state<HTMLInputElement>()
	let resultPanel = $state<HTMLDivElement>()
	// Every guess and new game replaces the history array, so a warning tagged
	// with the array it was raised against disappears on its own afterwards.
	// Warnings keep a renderer rather than text so they follow language changes.
	let warning = $state.raw<{
		render: ((t: Messages) => string) | null
		round: SinglePlayerGuess[]
	}>({ render: null, round: $gameStore.guessHistory })

	const t = $derived(messages[$gameStore.locale])
	const warningMessage = $derived(
		warning.round === $gameStore.guessHistory && warning.render
			? warning.render(t)
			: '',
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
			return { message: t.single.perfect, tone: 'correct' }
		}
		if ($gameStore.gameOver) {
			return { message: t.single.betterLuck, tone: 'incorrect' }
		}
		return {
			message: t.single.feedback(
				latestGuess.correctDigits,
				latestGuess.correctPositions,
			),
			tone: 'info',
		}
	})
	const attemptsUsed = $derived($gameStore.guessHistory.length)
	const newestFirst = $derived(
		$gameStore.guessHistory
			.map((entry, index) => ({ ...entry, number: index + 1 }))
			.reverse(),
	)

	function warn(render: (t: Messages) => string) {
		warning = { render, round: $gameStore.guessHistory }
	}

	function makeGuess() {
		if ($gameStore.gameOver) return

		const guess = guessInput.trim()
		const { digitCount } = $gameStore.settings

		if (guess === '') {
			warn((t) => t.single.empty)
			return
		}

		if (guess.length !== digitCount) {
			warn((t) => t.validation.length(digitCount))
			return
		}

		const validation = validateGuess(guess, digitCount)
		if (!validation.valid) {
			const { problem } = validation
			warn((t) => t.validation[problem](digitCount))
			return
		}

		if ($gameStore.guessHistory.some((entry) => entry.guess === guess)) {
			warn((t) => t.single.duplicate(guess))
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
		<label for="single-player-guess" class="sr-only">{t.single.guessLabel}</label>
		<input
			id="single-player-guess"
			type="text"
			bind:this={guessField}
			value={guessInput}
			oninput={handleGuessInput}
			onkeypress={handleKeyPress}
			placeholder={t.single.placeholder}
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
			{t.single.submit}
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
					<p>{t.single.won($gameStore.targetNumber)}</p>
					<p>{t.single.wonWith(attemptsUsed)}</p>
				</div>
			{:else}
				<p class="text-xl font-bold">
					{#each t.single.lost($gameStore.targetNumber) as part}{#if typeof part === 'string'}{part}{:else}<strong>{part.value}</strong>{/if}{/each}
				</p>
			{/if}
			<button type="button" class="btn-primary" onclick={playAgain}>{t.single.playAgain}</button>
		</div>
	{/if}

	<section class="mt-8" aria-labelledby="single-player-history">
		<h3 id="single-player-history" class="mb-3 font-display text-lg font-bold">{t.single.historyHeading}</h3>
		<div class="surface-translucent-soft max-h-52 space-y-1 overflow-y-auto rounded-2xl border-[1.5px] border-[var(--glass-border)] p-2">
			{#each newestFirst as entry (entry.number)}
				<div class="history-row flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 {entry.number === attemptsUsed ? 'history-row-newest' : ''}">
					<span class="whitespace-nowrap font-bold tabular-nums">{t.single.historyGuess(entry.number, entry.guess)}</span>
					<span class="whitespace-nowrap text-sm text-[var(--glass-muted)]">{t.single.historyScore(entry.correctDigits, entry.correctPositions)}</span>
				</div>
			{:else}
				<p class="px-3 py-2 text-sm text-[var(--glass-muted)]">
					{t.single.historyEmpty}
				</p>
			{/each}
		</div>
	</section>
</div>

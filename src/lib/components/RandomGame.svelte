<script lang="ts">
	import { tick, type Snippet } from 'svelte'
	import { gameStore, calculateFeedback, type SinglePlayerGuess } from '$lib/stores/gameStore'
	import { messages, type Messages } from '$lib/i18n/messages'
	import { celebrate } from '$lib/effects/celebrate'
	import Keypad from './Keypad.svelte'

	let { toolbar }: { toolbar?: Snippet } = $props()

	let heading = $state<HTMLHeadingElement>()
	let board = $state<HTMLOListElement>()
	let resultPanel = $state<HTMLDivElement>()
	let announce = $state<'entry' | 'guess' | null>(null)
	// Typed digits and warnings belong to one round, so a new game clears them.
	let typed = $state.raw({ round: $gameStore.round, digits: '' })
	let warning = $state.raw<{
		render: ((t: Messages) => string) | null
		guesses: SinglePlayerGuess[]
		entry: string
	}>({ render: null, guesses: [], entry: '' })

	if (!$gameStore.targetNumber) {
		gameStore.startNewGame()
	}

	const t = $derived(messages[$gameStore.locale])
	const target = $derived($gameStore.targetNumber)
	const digits = $derived(target.length)
	const history = $derived($gameStore.guessHistory)
	const entry = $derived(typed.round === $gameStore.round ? typed.digits : '')
	const won = $derived(
		$gameStore.gameOver && history[history.length - 1]?.correctPositions === digits,
	)
	const playing = $derived(!$gameStore.gameOver)
	const rows = $derived(playing ? history.length + $gameStore.attemptsLeft : history.length)
	const warningMessage = $derived(
		warning.render && warning.guesses === history && warning.entry === entry
			? warning.render(t)
			: '',
	)
	const announcement = $derived.by(() => {
		if (announce === 'entry') return t.board.entry(spaced(entry))
		if (announce === 'guess' && history.length) return rowLabel(t, history.length - 1)
		return ''
	})

	const spaced = (value: string) => [...value].join(' ')

	function rowLabel(t: Messages, index: number) {
		const { guess, correctDigits, correctPositions } = history[index]
		return t.random.row(index + 1, spaced(guess), correctDigits, correctPositions)
	}

	function setEntry(value: string) {
		typed = { round: $gameStore.round, digits: value }
		announce = 'entry'
	}

	function warn(render: (t: Messages) => string) {
		warning = { render, guesses: history, entry }
	}

	function type(digit: string) {
		if (entry.length < digits) {
			setEntry(entry + digit)
		}
	}

	function erase() {
		if (entry) {
			setEntry(entry.slice(0, -1))
		}
	}

	async function submit() {
		const guess = entry
		if (guess.length < digits) {
			warn((t) => t.board.short(digits))
			return
		}
		if (history.some((row) => row.guess === guess)) {
			warn((t) => t.board.duplicate(guess))
			return
		}
		const feedback = calculateFeedback(guess, target)
		gameStore.addGuess({ guess, ...feedback })
		typed = { round: $gameStore.round, digits: '' }
		announce = 'guess'
		const solved = feedback.correctPositions === digits
		if (solved || $gameStore.attemptsLeft === 0) {
			gameStore.setGameOver(true)
		}
		if (solved) {
			celebrate($gameStore.sound)
		}
		await tick()
		// The keypad leaves with the last guess, so focus moves to the result.
		if ($gameStore.gameOver) {
			resultPanel?.focus()
		} else {
			board?.children[history.length]?.scrollIntoView?.({ block: 'nearest' })
		}
	}

	async function playAgain() {
		gameStore.startNewGame()
		await tick()
		heading?.focus()
	}
</script>

<div class="game-area flex flex-1 flex-col">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
		{@render toolbar?.()}
		<h2 id="random-heading" bind:this={heading} tabindex="-1" class="font-display text-lg font-bold sm:text-2xl">
			{t.random.triesLeft($gameStore.attemptsLeft)}
		</h2>
	</div>

	<p class="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm" aria-hidden="true">
		<span class="inline-flex items-center gap-1.5"><span class="hint hint-digits legend-hint"></span>{t.random.inNumber}</span>
		<span class="inline-flex items-center gap-1.5"><span class="hint hint-spots legend-hint"></span>{t.random.inSpot}</span>
	</p>

	<div class="random-area relative" class:board-finished={!playing} style:--rows={rows} style:--cols={digits}>
		<div class="absolute inset-0 overflow-y-auto">
			<ol bind:this={board} class="board mx-auto grid w-fit" aria-label={t.board.label}>
				{#each { length: rows } as _, rowIndex}
					{@const row = history[rowIndex]}
					{@const current = !row && rowIndex === history.length && playing}
					<li class="board-row" aria-hidden={row || current ? undefined : 'true'}>
						{#if row}
							<span class="sr-only">{rowLabel(t, rowIndex)}</span>
						{:else if current}
							<span class="sr-only">{t.board.entry(spaced(entry))}</span>
						{/if}
						{#each { length: digits } as _, index}
							{@const digit = row ? row.guess[index] : current ? entry[index] : undefined}
							<span
								aria-hidden="true"
								class="tile {row ? 'tile-ink' : digit ? 'mark-typed' : ''}"
							>{digit ?? ''}</span>
						{/each}
						<span class="flex gap-[calc(var(--tile)*0.15)]" aria-hidden="true">
							<span class="hint {row ? 'hint-digits' : 'hint-empty'}">{row?.correctDigits ?? ''}</span>
							<span class="hint {row ? 'hint-spots' : 'hint-empty'}">{row?.correctPositions ?? ''}</span>
						</span>
					</li>
				{/each}
			</ol>
		</div>

		<!-- Live regions stay mounted so screen readers announce every change, including the first.
			The warning floats over the board so the tiles never resize under it. -->
		{#if playing}
			<div role="alert" class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
				{#if warningMessage}
					<div class="banner banner-warning warning-toast text-center">{warningMessage}</div>
				{/if}
			</div>
		{/if}
	</div>
	<p class="sr-only" role="status">{announcement}</p>

	{#if playing}
		<Keypad ontype={type} onerase={erase} onsubmit={() => void submit()} />
	{:else}
		<div
			bind:this={resultPanel}
			tabindex="-1"
			class="banner {won ? 'banner-correct' : 'banner-incorrect'} mt-3 space-y-3 p-5 text-center"
		>
			{#if won}
				<div class="text-xl font-bold">
					<p>{t.random.won(target)}</p>
					<p>{t.random.wonWith(history.length)}</p>
				</div>
			{:else}
				<p class="text-xl font-bold">
					{#each t.random.lost(target) as part}{#if typeof part === 'string'}{part}{:else}<strong class="tracking-widest">{part.value}</strong>{/if}{/each}
				</p>
			{/if}
			<button type="button" class="btn-primary" onclick={playAgain}>{t.random.playAgain}</button>
		</div>
	{/if}
</div>

<style>
	/* Like the Guessle board, tiles size themselves to the height left; a long
	   game keeps them legible and scrolls inside the board instead. */
	.random-area {
		--gap: 0.375rem;
		--tile-min: 2rem;
		--tile-max: 3.5rem;
		container-type: size;
		flex: 1 1 0;
		min-height: calc(min(var(--rows), 5) * var(--tile-min) + (min(var(--rows), 5) - 1) * var(--gap));
		max-height: calc(var(--rows) * var(--tile-max) + (var(--rows) - 1) * var(--gap));
	}

	.board-finished {
		--gap: 0.25rem;
		--tile-min: 1.25rem;
	}

	@media (max-width: 599px), (max-height: 539px) {
		.board-finished {
			--tile-min: 2rem;
		}
	}

	/* Each row is the digits plus two hints that together take 1.75 tiles. */
	.board {
		--tile: clamp(
			var(--tile-min),
			min(
				(100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows),
				(100cqw - var(--cols) * var(--gap)) / (var(--cols) + 1.75)
			),
			var(--tile-max)
		);
		gap: var(--gap);
	}

	.board-row {
		display: grid;
		grid-template-columns: repeat(var(--cols), var(--tile)) auto;
		align-items: center;
		gap: var(--gap);
	}

	.tile-ink {
		border-color: var(--glass-fg);
		background: var(--glass-fg);
		color: var(--glass-bg);
	}

	.hint {
		position: relative;
		display: grid;
		place-items: center;
		width: calc(var(--tile) * 0.8);
		height: calc(var(--tile) * 0.8);
		border-radius: calc(var(--tile) * 0.18);
		color: var(--tile-fg);
		font-family: var(--font-display);
		font-size: calc(var(--tile) * 0.4);
		font-weight: 700;
	}

	.hint-digits {
		background: var(--tile-present);
	}

	/* The dot matches the wrong-spot tiles, so the two hints never rely on color alone. */
	.hint-digits::after {
		content: '';
		position: absolute;
		bottom: calc(var(--tile) * 0.06);
		left: 50%;
		width: max(3px, calc(var(--tile) * 0.1));
		height: max(3px, calc(var(--tile) * 0.1));
		border-radius: 50%;
		background: currentColor;
		transform: translateX(-50%);
	}

	.hint-spots {
		background: var(--tile-correct);
	}

	.hint-empty {
		border: 1.5px solid color-mix(in srgb, var(--glass-border) 25%, transparent);
	}

	.legend-hint {
		--tile: 1.5rem;
	}
</style>

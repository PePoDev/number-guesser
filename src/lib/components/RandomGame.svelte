<script lang="ts">
	import { tick, type Snippet } from 'svelte'
	import { gameStore, type SinglePlayerGuess } from '$lib/stores/gameStore'
	import { messages, type Messages } from '$lib/i18n/messages'
	import { celebrate } from '$lib/effects/celebrate'
	import Keypad from './Keypad.svelte'

	let { toolbar }: { toolbar?: Snippet } = $props()

	let heading = $state<HTMLHeadingElement>()
	let board = $state<HTMLOListElement>()
	let scroller = $state<HTMLDivElement>()
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
	const status = $derived(
		playing
			? t.random.triesLeft($gameStore.attemptsLeft)
			: won
				? t.random.solved(history.length)
				: t.random.outOfTries,
	)
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
		gameStore.addRandomGuess(guess)
		typed = { round: $gameStore.round, digits: '' }
		announce = 'guess'
		if (won) {
			celebrate($gameStore.sound)
		}
		await tick()
		// The keypad leaves with the last guess, so focus moves to the result,
		// and a long board ends on the row that settled the game.
		if ($gameStore.gameOver) {
			if (scroller) {
				scroller.scrollTop = scroller.scrollHeight
			}
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
			{status}
		</h2>
	</div>

	<!-- The board scrolls once it fills its box, so a warning takes the legend's line
		instead of covering the row being typed. Live regions stay mounted. -->
	<div class="mb-0.5 flex min-h-6 items-center justify-center">
		<p class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm" aria-hidden="true" hidden={!!warningMessage}>
			<span class="inline-flex items-center gap-1.5"><span class="hint hint-digits legend-hint"></span>{t.random.inNumber}</span>
			<span class="inline-flex items-center gap-1.5"><span class="hint hint-spots legend-hint"></span>{t.random.inSpot}</span>
		</p>
		<div role="alert">
			{#if warningMessage}
				<div class="banner banner-warning warning-line text-center">{warningMessage}</div>
			{/if}
		</div>
	</div>

	<div class="random-area relative" class:board-finished={!playing} style:--rows={rows} style:--cols={digits}>
		<div bind:this={scroller} class="board-scroll absolute inset-y-0 right-0 left-0 mx-auto w-fit overflow-x-hidden overflow-y-auto">
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
	</div>
	<p class="sr-only" role="status">{announcement}</p>

	{#if playing}
		<Keypad ontype={type} onerase={erase} onsubmit={() => void submit()} />
	{:else}
		<!-- The heading already shows the outcome, so the result strip carries the answer
			and the next step; screen readers hear the outcome first when it takes focus. -->
		<div
			bind:this={resultPanel}
			tabindex="-1"
			class="banner {won ? 'banner-correct' : 'banner-incorrect'} mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center"
		>
			<p class="text-lg font-semibold">
				<span class="sr-only">{status}</span>
				{#each t.random.answer(target) as part}{#if typeof part === 'string'}{part}{:else}<strong class="accent-value tracking-widest">{part.value}</strong>{/if}{/each}
			</p>
			<button type="button" class="btn-primary" onclick={playAgain}>{t.random.playAgain}</button>
		</div>
	{/if}
</div>

<style>
	/* Like the Guessle board, tiles size themselves to the height left; a long
	   game keeps them legible and scrolls inside the board instead. */
	.random-area {
		--gap: 0.25rem;
		--tile-min: 2rem;
		--tile-max: 3.5rem;
		container-type: size;
		flex: 1 1 0;
		min-height: calc(min(var(--rows), 5) * var(--tile-min) + (min(var(--rows), 5) - 1) * var(--gap));
		max-height: calc(var(--rows) * var(--tile-max) + (var(--rows) - 1) * var(--gap));
	}

	/* A finished board keeps a default game's seven rows in view, so the answer row
	   never hides inside the box. */
	.board-finished {
		min-height: calc(min(var(--rows), 7) * var(--tile-min) + (min(var(--rows), 7) - 1) * var(--gap));
	}

	/* Where the panel or page scrolls anyway, the board shows every row rather
	   than nesting a second scroll inside it. */
	@media (max-width: 599px) {
		.board-finished {
			min-height: calc(var(--rows) * var(--tile-min) + (var(--rows) - 1) * var(--gap));
		}
	}

	@media (max-height: 539px) {
		.random-area {
			min-height: calc(var(--rows) * var(--tile-min) + (var(--rows) - 1) * var(--gap));
		}
	}

	/* Shadows show only on the side that has more rows to scroll to. */
	.board-scroll {
		background:
			linear-gradient(var(--glass-bg) 30%, transparent) top / 100% 1.5rem local,
			linear-gradient(transparent, var(--glass-bg) 70%) bottom / 100% 1.5rem local,
			radial-gradient(farthest-side at 50% 0, color-mix(in srgb, var(--glass-fg) 25%, transparent), transparent) top / 100% 0.625rem scroll,
			radial-gradient(farthest-side at 50% 100%, color-mix(in srgb, var(--glass-fg) 25%, transparent), transparent) bottom / 100% 0.625rem scroll;
		background-repeat: no-repeat;
	}

	/* As tall as the legend it replaces, so showing it never resizes the board. */
	.warning-line {
		padding: 0 12px;
		font-size: 0.875rem;
		line-height: 1.25rem;
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

	/* Shape tells the hints apart without color: a circle for digits in the number,
	   a square for digits in the right spot. */
	.hint-digits {
		border-radius: 50%;
		background: var(--tile-present);
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

	/* High-contrast themes drop background fills, so the hints keep an outline in their shape. */
	@media (forced-colors: active) {
		.hint-digits,
		.hint-spots {
			border: 1.5px solid CanvasText;
		}
	}
</style>

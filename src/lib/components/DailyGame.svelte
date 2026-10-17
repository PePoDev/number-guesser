<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte'
	import {
		gameStore,
		DAILY_DIGITS,
		DAILY_TRIES,
		dailyNumber,
		dailyStatus,
		dailyTarget,
		digitStates,
		formatCountdown,
		liveStreak,
		msUntilDaily,
		scoreTiles,
		shareGrid,
	} from '$lib/stores/gameStore'
	import { readDailyProgress, saveDailyProgress } from '$lib/daily/progress'
	import { messages, type Messages } from '$lib/i18n/messages'
	import { celebrate } from '$lib/effects/celebrate'
	import Keypad from './Keypad.svelte'

	let { toolbar }: { toolbar?: Snippet } = $props()

	let heading = $state<HTMLHeadingElement>()
	let resultPanel = $state<HTMLDivElement>()
	let entry = $state('')
	let now = $state(new Date())
	let copied = $state(false)
	let copiedTimer: ReturnType<typeof setTimeout> | undefined
	let announce = $state<'entry' | 'guess' | 'copied' | null>(null)
	// A warning belongs to the board and entry it was raised against, so the
	// next keypress or guess clears it.
	let warning = $state.raw<{
		render: ((t: Messages) => string) | null
		guesses: string[]
		entry: string
	}>({ render: null, guesses: [], entry: '' })

	function openDay(day: number) {
		gameStore.loadDaily(readDailyProgress(day))
		entry = ''
		announce = null
	}

	const openedOn = dailyNumber(new Date())
	if ($gameStore.daily.day !== openedOn) {
		openDay(openedOn)
	}

	const t = $derived(messages[$gameStore.locale])
	const daily = $derived($gameStore.daily)
	const target = $derived(dailyTarget(daily.day))
	const status = $derived(dailyStatus(daily.guesses, target))
	const won = $derived(status === 'won')
	const scored = $derived(
		daily.guesses.map((guess) => ({ guess, tiles: scoreTiles(guess, target) })),
	)
	const keys = $derived(digitStates(daily.guesses, target))
	const rows = $derived(status === 'playing' ? DAILY_TRIES : scored.length)
	const untilNext = $derived(msUntilDaily(daily.day + 1, now))
	const warningMessage = $derived(
		warning.render && warning.guesses === daily.guesses && warning.entry === entry
			? warning.render(t)
			: '',
	)
	const statTiles = $derived([
		{ label: t.daily.played, value: daily.stats.played },
		{
			label: t.daily.winRate,
			value: daily.stats.played
				? Math.round((daily.stats.wins / daily.stats.played) * 100)
				: 0,
		},
		{ label: t.daily.currentStreak, value: liveStreak(daily.stats, daily.day) },
		{ label: t.daily.maxStreak, value: daily.stats.maxStreak },
	])
	const mostWins = $derived(Math.max(1, ...daily.stats.distribution))
	const announcement = $derived.by(() => {
		const latest = scored.length - 1
		if (announce === 'entry') return t.board.entry(spaced(entry))
		if (announce === 'copied') return t.daily.copied
		if (announce === 'guess' && latest >= 0) return rowLabel(t, latest)
		return ''
	})

	function rowLabel(t: Messages, index: number) {
		const { guess, tiles } = scored[index]
		return t.daily.row(
			index + 1,
			tiles.map((state, digit) => t.daily.tile(guess[digit], state)).join(', '),
		)
	}

	const spaced = (digits: string) => [...digits].join(' ')

	function warn(render: (t: Messages) => string) {
		warning = { render, guesses: daily.guesses, entry }
	}

	function type(digit: string) {
		if (entry.length < DAILY_DIGITS) {
			entry += digit
			announce = 'entry'
		}
	}

	function erase() {
		if (entry) {
			entry = entry.slice(0, -1)
			announce = 'entry'
		}
	}

	async function submit() {
		const guess = entry
		if (guess.length < DAILY_DIGITS) {
			warn((t) => t.board.short(DAILY_DIGITS))
			return
		}
		if (daily.guesses.includes(guess)) {
			warn((t) => t.board.duplicate(guess))
			return
		}
		gameStore.addDailyGuess(guess)
		saveDailyProgress($gameStore.daily)
		entry = ''
		announce = 'guess'
		if (status === 'won') {
			celebrate($gameStore.sound)
		}
		await tick()
		// The keypad leaves with the last guess, so focus moves to the result.
		if (status !== 'playing') {
			resultPanel?.focus()
		}
	}

	async function shareResult() {
		const score = `${won ? daily.guesses.length : 'X'}/${DAILY_TRIES}`
		const text = `${t.daily.shareTitle(daily.day, score)}\n\n${shareGrid(daily.guesses, target)}`
		const url = new URL(window.location.href)
		url.search = ''
		url.hash = ''
		// Phones paste a result through the share sheet; desktops expect a copy.
		if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
			try {
				await navigator.share({ text, url: url.toString() })
				return
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					return
				}
			}
		}
		try {
			await navigator.clipboard.writeText(`${text}\n\n${url}`)
		} catch {
			warn((t) => t.daily.shareFailed)
			return
		}
		copied = true
		announce = 'copied'
		clearTimeout(copiedTimer)
		copiedTimer = setTimeout(() => {
			copied = false
		}, 2000)
	}

	async function playToday() {
		openDay(dailyNumber(new Date()))
		await tick()
		heading?.focus()
	}

	async function playRandom() {
		gameStore.setMode('random')
		gameStore.startNewGame()
		await tick()
		document.getElementById('random-heading')?.focus()
	}

	// An unstarted board follows the calendar; a started or finished one waits
	// for the player, so a result never vanishes at midnight.
	onMount(() => {
		const timer = setInterval(() => {
			now = new Date()
			if (daily.guesses.length === 0 && dailyNumber(now) !== daily.day) {
				openDay(dailyNumber(now))
			}
		}, 1000)
		return () => {
			clearInterval(timer)
			clearTimeout(copiedTimer)
		}
	})
</script>

<div class="game-area flex flex-1 flex-col">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
		{@render toolbar?.()}
		<h2 bind:this={heading} tabindex="-1" class="font-display text-lg font-bold sm:text-2xl">
			{t.daily.heading(daily.day)}
		</h2>
	</div>

	<div
		class="board-area relative"
		class:board-finished={status !== 'playing'}
		style:--rows={rows}
		style:--cols={DAILY_DIGITS}
	>
		<ol class="board mx-auto grid w-fit" aria-label={t.board.label}>
			{#each { length: rows } as _, rowIndex}
				{@const row = scored[rowIndex]}
				{@const current = !row && rowIndex === scored.length && status === 'playing'}
				<li class="board-row grid" aria-hidden={row || current ? undefined : 'true'}>
					{#if row}
						<span class="sr-only">{rowLabel(t, rowIndex)}</span>
					{:else if current}
						<span class="sr-only">{t.board.entry(spaced(entry))}</span>
					{/if}
					{#each { length: DAILY_DIGITS } as _, index}
						{@const digit = row ? row.guess[index] : current ? entry[index] : undefined}
						<span
							aria-hidden="true"
							class="tile mark-{row ? row.tiles[index] : digit ? 'typed' : 'none'}"
							style:--i={index}
						>{digit ?? ''}</span>
					{/each}
				</li>
			{/each}
		</ol>

		<!-- Live regions stay mounted so screen readers announce every change, including the first.
			During play the warning floats over the bottom rows, which are empty until the last try,
			so the tiles never resize under it. -->
		{#if status === 'playing'}
			<div role="alert" class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
				{#if warningMessage}
					<div class="banner banner-warning warning-toast text-center">{warningMessage}</div>
				{/if}
			</div>
		{/if}
	</div>
	<p class="sr-only" role="status">{announcement}</p>
	{#if status !== 'playing'}
		<div role="alert">
			{#if warningMessage}
				<div class="banner banner-warning mt-3 text-center">{warningMessage}</div>
			{/if}
		</div>
	{/if}

	{#if status === 'playing'}
		<Keypad states={keys} ontype={type} onerase={erase} onsubmit={() => void submit()} />
	{:else}
		<div
			bind:this={resultPanel}
			tabindex="-1"
			class="banner {won ? 'banner-correct' : 'banner-incorrect'} @container mt-3 space-y-3 p-5 short:space-y-2"
		>
			<p class="text-center text-xl font-bold text-balance">
				{#if won}
					{t.daily.won(daily.guesses.length)}
				{:else}
					{#each t.daily.lost(target) as part}{#if typeof part === 'string'}{part}{:else}<strong class="tracking-widest">{part.value}</strong>{/if}{/each}
				{/if}
			</p>

			<div class="grid gap-3 @min-[22rem]:grid-cols-2 @min-[22rem]:gap-4">
				<section aria-labelledby="daily-stats-heading">
					<h3 id="daily-stats-heading" class="eyebrow mb-2 text-center">{t.daily.statsHeading}</h3>
					<dl class="grid grid-cols-4 gap-2 @min-[22rem]:grid-cols-2">
						{#each statTiles as stat (stat.label)}
							<div class="surface-translucent flex flex-col-reverse items-center justify-end rounded-xl p-2 text-center">
								<dt class="text-xs leading-tight text-[var(--glass-muted)]">{stat.label}</dt>
								<dd class="text-2xl font-semibold">{stat.value}</dd>
							</div>
						{/each}
					</dl>
				</section>

				<section aria-labelledby="daily-distribution-heading">
					<h3 id="daily-distribution-heading" class="eyebrow mb-2 text-center">{t.daily.distributionHeading}</h3>
					<ol class="mx-auto max-w-sm space-y-1">
						{#each daily.stats.distribution as wins, index}
							<li class="grid grid-cols-[1rem_1fr_2rem] items-center gap-2 text-sm leading-4.5">
								<span class="sr-only">{t.daily.distributionRow(index + 1, wins)}</span>
								<span aria-hidden="true" class="font-semibold">{index + 1}</span>
								<span aria-hidden="true" class="flex">
									<span
										class="dist-bar"
										class:dist-today={won && index === daily.guesses.length - 1 && daily.stats.lastWonDay === daily.day}
										style:width="{(wins / mostWins) * 100}%"
									></span>
								</span>
								<span aria-hidden="true" class="text-right tabular-nums">{wins}</span>
							</li>
						{/each}
					</ol>
				</section>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
				<div class="relative">
					{#if copied}
						<span aria-hidden="true" class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--glass-border)] bg-[var(--glass-fg)] px-3 py-2 text-sm text-[var(--glass-bg)] shadow-lg">{t.daily.copied}</span>
					{/if}
					<button type="button" class="btn-primary" onclick={shareResult}>{t.daily.share}</button>
				</div>
				<button type="button" class="btn-secondary" onclick={playRandom}>{t.daily.practice}</button>
				{#if untilNext <= 0}
					<button type="button" class="btn-secondary" onclick={playToday}>{t.daily.nextReady}</button>
				{:else}
					<p>
						{t.daily.next}
						<span role="timer" class="font-bold tabular-nums">{formatCountdown(untilNext)}</span>
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* The board takes whatever height the heading and keypad leave, so tiles
	   are sized from the board area's container units. */
	.board-area {
		--gap: 0.375rem;
		--tile-min: 2rem;
		--tile-max: 3.5rem;
		container-type: size;
		flex: 1 1 0;
		min-height: calc(var(--rows) * var(--tile-min) + (var(--rows) - 1) * var(--gap));
		max-height: calc(var(--rows) * var(--tile-max) + (var(--rows) - 1) * var(--gap));
	}

	.board-finished {
		--gap: 0.25rem;
		--tile-min: 1.25rem;
	}

	/* Phones and sideways windows scroll a finished game anyway, so shrinking its tiles saves nothing. */
	@media (max-width: 599px), (max-height: 539px) {
		.board-finished {
			--tile-min: 2rem;
		}
	}

	.board {
		--tile: clamp(
			var(--tile-min),
			min(
				(100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows),
				(100cqw - (var(--cols) - 1) * var(--gap)) / var(--cols)
			),
			var(--tile-max)
		);
		gap: var(--gap);
	}

	.board-row {
		grid-template-columns: repeat(var(--cols), var(--tile));
		gap: var(--gap);
	}

	.dist-bar {
		min-width: 2px;
		height: 14px;
		border-radius: 0 4px 4px 0;
		background: var(--tile-absent);
	}

	.dist-today {
		background: var(--tile-correct);
	}

</style>

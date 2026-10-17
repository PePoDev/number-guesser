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
		sanitizeDigits,
		scoreTiles,
		shareGrid,
	} from '$lib/stores/gameStore'
	import { readDailyProgress, saveDailyProgress } from '$lib/daily/progress'
	import { messages, type Messages } from '$lib/i18n/messages'

	let { toolbar }: { toolbar?: Snippet } = $props()

	let root = $state<HTMLDivElement>()
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
		if (announce === 'entry') return t.daily.entry(spaced(entry))
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
			warn((t) => t.daily.short(DAILY_DIGITS))
			return
		}
		if (daily.guesses.includes(guess)) {
			warn((t) => t.daily.duplicate(guess))
			return
		}
		gameStore.addDailyGuess(guess)
		saveDailyProgress($gameStore.daily)
		entry = ''
		announce = 'guess'
		await tick()
		// The keypad leaves with the last guess, so focus moves to the result.
		if (status !== 'playing') {
			resultPanel?.focus()
		}
	}

	// A tapped key gives focus back, so a later physical Enter submits instead
	// of pressing that key again; keyboard activation keeps focus in place.
	function press(action: () => void) {
		return (event: MouseEvent) => {
			if (event.detail > 0) {
				;(event.currentTarget as HTMLElement).blur()
			}
			action()
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		const target = event.target instanceof Element ? event.target : null
		if (
			status !== 'playing' ||
			event.defaultPrevented ||
			event.isComposing ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			target?.closest('input, select, textarea, [contenteditable], [role="dialog"]') ||
			!root ||
			root.closest('[hidden]')
		) {
			return
		}
		const digit = event.key.length === 1 ? sanitizeDigits(event.key, 1) : ''
		if (digit) {
			type(digit)
		} else if (event.key === 'Backspace') {
			erase()
		} else if (event.key === 'Enter' && !target?.closest('button, a')) {
			void submit()
		} else {
			return
		}
		event.preventDefault()
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

	async function playClassic() {
		gameStore.setMode('single')
		gameStore.startNewGame()
		await tick()
		document.getElementById('single-player-guess')?.focus()
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

<svelte:window onkeydown={handleKeydown} />

{#snippet key(digit: string)}
	<button
		type="button"
		class="key mark-{keys[digit] ?? 'none'}"
		aria-label={keys[digit] ? t.daily.tile(digit, keys[digit]) : digit}
		onclick={press(() => type(digit))}
	>
		{digit}
	</button>
{/snippet}

<div class="game-area flex flex-1 flex-col" bind:this={root}>
	<div class="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
		{@render toolbar?.()}
		<h2 bind:this={heading} tabindex="-1" class="font-display text-xl font-bold sm:text-2xl">
			{t.daily.heading(daily.day)}
		</h2>
	</div>

	<div class="board-area relative" class:board-finished={status !== 'playing'} style:--rows={rows}>
		<ol class="board mx-auto grid w-fit" aria-label={t.daily.board}>
			{#each { length: rows } as _, rowIndex}
				{@const row = scored[rowIndex]}
				{@const current = !row && rowIndex === scored.length && status === 'playing'}
				<li class="board-row grid grid-cols-5" aria-hidden={row || current ? undefined : 'true'}>
					{#if row}
						<span class="sr-only">{rowLabel(t, rowIndex)}</span>
					{:else if current}
						<span class="sr-only">{t.daily.entry(spaced(entry))}</span>
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
			The warning floats over the board so the tiles never resize under it. -->
		<div role="alert" class="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
			{#if warningMessage}
				<div class="banner banner-warning warning-toast text-center">{warningMessage}</div>
			{/if}
		</div>
	</div>
	<p class="sr-only" role="status">{announcement}</p>

	{#if status === 'playing'}
		<div class="keypad mx-auto mt-3 grid w-full max-w-md gap-2" role="group" aria-label={t.daily.keypad}>
			<div class="grid grid-cols-5 gap-2">
				{#each ['1', '2', '3', '4', '5'] as digit (digit)}{@render key(digit)}{/each}
			</div>
			<div class="grid grid-cols-5 gap-2">
				{#each ['6', '7', '8', '9', '0'] as digit (digit)}{@render key(digit)}{/each}
			</div>
			<div class="grid grid-cols-2 gap-2">
				<button type="button" class="btn-secondary inline-flex items-center justify-center gap-2" onclick={press(erase)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
						<path d="m12 9 6 6M18 9l-6 6" />
					</svg>
					{t.daily.delete}
				</button>
				<button type="button" class="btn-primary" onclick={press(() => void submit())}>
					{t.daily.enter}
				</button>
			</div>
		</div>
	{:else}
		<div
			bind:this={resultPanel}
			tabindex="-1"
			class="banner {won ? 'banner-correct' : 'banner-incorrect'} @container mt-3 space-y-3 p-5 short:space-y-2"
		>
			<p class="text-center text-xl font-bold">
				{#if won}
					{t.daily.won(daily.guesses.length)}
				{:else}
					{#each t.daily.lost(target) as part}{#if typeof part === 'string'}{part}{:else}<strong class="tracking-widest">{part.value}</strong>{/if}{/each}
				{/if}
			</p>

			<div class="grid gap-3 @sm:grid-cols-2 @sm:gap-4">
				<section aria-labelledby="daily-stats-heading">
					<h3 id="daily-stats-heading" class="eyebrow mb-2 text-center">{t.daily.statsHeading}</h3>
					<dl class="grid grid-cols-4 gap-2 @sm:grid-cols-2">
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
										class:dist-today={won && index === daily.guesses.length - 1}
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
				<button type="button" class="btn-secondary" onclick={playClassic}>{t.daily.practice}</button>
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

	.board {
		--tile: clamp(
			var(--tile-min),
			min(
				(100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows),
				(100cqw - 4 * var(--gap)) / 5
			),
			var(--tile-max)
		);
		gap: var(--gap);
	}

	.board-row {
		gap: var(--gap);
	}

	.warning-toast {
		background: color-mix(in srgb, var(--state-warning) 18%, var(--glass-bg));
	}

	.tile {
		position: relative;
		display: grid;
		place-items: center;
		width: var(--tile);
		height: var(--tile);
		border: 1.5px solid color-mix(in srgb, var(--glass-border) 25%, transparent);
		border-radius: calc(var(--tile) * 0.18);
		background: color-mix(in srgb, var(--surface-white) 40%, transparent);
		font-family: var(--font-display);
		font-size: calc(var(--tile) * 0.5);
		font-weight: 700;
		transition:
			background-color var(--motion-duration) var(--motion-easing),
			border-color var(--motion-duration) var(--motion-easing),
			color var(--motion-duration) var(--motion-easing);
		transition-delay: calc(var(--i) * 90ms);
	}

	.tile.mark-typed {
		border-color: var(--glass-border);
		background: var(--surface-white);
		transition-delay: 0ms;
	}

	.keypad button {
		min-height: clamp(2.75rem, 6dvh, 3.25rem);
	}

	.key {
		position: relative;
		border: 1.5px solid var(--glass-border);
		border-radius: 10px;
		background: var(--surface-white);
		color: var(--glass-fg);
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 700;
		cursor: pointer;
	}

	.key:hover {
		transform: translateY(-1px);
	}

	.mark-correct {
		border-color: var(--tile-correct);
		background: var(--tile-correct);
		color: var(--tile-fg);
	}

	.mark-present {
		border-color: var(--tile-present);
		background: var(--tile-present);
		color: var(--tile-fg);
	}

	/* Green and yellow can look alike to color-blind players; the dot tells them apart. */
	.mark-present::after {
		content: '';
		position: absolute;
		bottom: 5px;
		left: 50%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		transform: translateX(-50%);
	}

	.tile.mark-present::after {
		bottom: calc(var(--tile) * 0.08);
		width: max(4px, calc(var(--tile) * 0.11));
		height: max(4px, calc(var(--tile) * 0.11));
	}

	.mark-absent {
		border-color: var(--tile-absent);
		background: var(--tile-absent);
		color: var(--tile-absent-fg);
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

	@media (prefers-reduced-motion: reduce) {
		.tile {
			transition: none;
		}
	}
</style>

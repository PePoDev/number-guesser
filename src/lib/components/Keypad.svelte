<script lang="ts">
	import { gameStore, sanitizeDigits, type TileState } from '$lib/stores/gameStore'
	import { messages } from '$lib/i18n/messages'

	interface Props {
		states?: Partial<Record<string, TileState>>
		ontype: (digit: string) => void
		onerase: () => void
		onsubmit: () => void
	}

	let { states = {}, ontype, onerase, onsubmit }: Props = $props()

	let root = $state<HTMLDivElement>()
	const t = $derived(messages[$gameStore.locale])

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
			ontype(digit)
		} else if (event.key === 'Backspace') {
			onerase()
		} else if (event.key === 'Enter' && !target?.closest('button, a')) {
			onsubmit()
		} else {
			return
		}
		event.preventDefault()
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet key(digit: string)}
	<button
		type="button"
		class="key mark-{states[digit] ?? 'none'}"
		aria-label={states[digit] ? t.daily.tile(digit, states[digit]) : digit}
		onclick={press(() => ontype(digit))}
	>
		{digit}
	</button>
{/snippet}

<div bind:this={root} class="keypad mx-auto mt-3 grid w-full max-w-md gap-2" role="group" aria-label={t.board.keypad}>
	<div class="grid grid-cols-5 gap-2">
		{#each ['1', '2', '3', '4', '5'] as digit (digit)}{@render key(digit)}{/each}
	</div>
	<div class="grid grid-cols-5 gap-2">
		{#each ['6', '7', '8', '9', '0'] as digit (digit)}{@render key(digit)}{/each}
	</div>
	<div class="grid grid-cols-2 gap-2">
		<button type="button" class="btn-secondary inline-flex items-center justify-center gap-2" onclick={press(onerase)}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
				<path d="m12 9 6 6M18 9l-6 6" />
			</svg>
			{t.board.delete}
		</button>
		<button type="button" class="btn-primary" onclick={press(onsubmit)}>
			{t.board.enter}
		</button>
	</div>
</div>

<style>
	.keypad button {
		min-height: clamp(2.75rem, 6dvh, 3.25rem);
	}
</style>

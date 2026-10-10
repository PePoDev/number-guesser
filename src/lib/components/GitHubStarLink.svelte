<script lang="ts">
	import { onMount } from 'svelte'

	const repoUrl = 'https://github.com/PePoDev/number-guesser'
	const apiUrl = 'https://api.github.com/repos/PePoDev/number-guesser'
	let starCount = $state<number | undefined>()
	const accessibleName = $derived(
		starCount === undefined
			? 'Open number-guesser on GitHub'
			: `Open number-guesser on GitHub, ${starCount} stars`,
	)

	function readStarCount(value: unknown): number | undefined {
		if (
			typeof value !== 'object' ||
			value === null ||
			!('stargazers_count' in value)
		) {
			return undefined
		}
		const count = value.stargazers_count
		return typeof count === 'number' && Number.isFinite(count)
			? count
			: undefined
	}

	onMount(() => {
		let active = true

		void fetch(apiUrl, {
			headers: {
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2026-03-10',
			},
		})
			.then(async (response) =>
				response.ok ? readStarCount(await response.json()) : undefined,
			)
			.then((count) => {
				if (active) {
					starCount = count
				}
			})
			.catch(() => {
				if (active) {
					starCount = undefined
				}
			})

		return () => {
			active = false
		}
	})
</script>

<a
	href={repoUrl}
	target="_blank"
	rel="noreferrer"
	class="btn-secondary btn-compact inline-flex shrink-0 items-center gap-2"
	aria-label={accessibleName}
>
	<svg
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />
	</svg>
	<span>GitHub</span>
	{#if starCount !== undefined}
		<span>{starCount}</span>
	{/if}
</a>

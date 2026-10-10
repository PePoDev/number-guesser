<script lang="ts">
	import '../app.css';
	import { gameStore } from '$lib/stores/gameStore';
	import { detectLocale } from '$lib/i18n/locale';

	let { children } = $props();

	gameStore.setLocale(detectLocale());

	$effect(() => {
		document.documentElement.lang = $gameStore.locale;
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{@render children?.()}

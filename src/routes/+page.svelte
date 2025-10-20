<script lang="ts">
	import { gameStore, validateGuess, calculateFeedback, type GuessEntry } from '$lib/stores/gameStore';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import SinglePlayerGame from '$lib/components/SinglePlayerGame.svelte';
	import MultiPlayerGame from '$lib/components/MultiPlayerGame.svelte';
	
	let showSettings = $state(false);
	
	function openSettings() {
		showSettings = true;
	}
	
	function closeSettings() {
		showSettings = false;
	}
	
	function startNewGame() {
		gameStore.startNewGame();
	}
	
	$effect(() => {
		gameStore.startNewGame();
	});
</script>

<svelte:head>
	<title>Number Guessing Game</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-5" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%);">
	<div class="glass-container rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative backdrop-blur-xl bg-white/20 border border-white/30">
		<button
			onclick={openSettings}
			class="absolute top-5 right-5 glass-button text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer z-10 backdrop-blur-md bg-white/20 border border-white/30"
			title="Game Settings"
			aria-label="Open Settings"
		>
			<span class="pointer-events-none">⚙️</span>
		</button>
		
		<h1 class="text-center text-white mb-5 text-4xl font-bold drop-shadow-2xl">
			Number Guessing Game
		</h1>
		
		<div class="text-center mb-8 p-4 glass-panel rounded-xl border border-white/30 backdrop-blur-md bg-white/10">
			<p class="my-1 text-white font-medium">
				I'm thinking of a <span class="font-bold text-yellow-300 text-xl drop-shadow-lg">{$gameStore.settings.digitCount}</span>-digit number. Can you guess it?
			</p>
			{#if $gameStore.mode === 'single'}
				<p class="my-1 text-white font-medium">
					You have <span class="font-bold text-yellow-300 text-xl drop-shadow-lg">{$gameStore.attemptsLeft}</span> attempts remaining.
				</p>
			{/if}
		</div>
		
		{#if $gameStore.mode === 'single'}
			<SinglePlayerGame />
		{:else}
			<MultiPlayerGame />
		{/if}
		
		<div class="text-center my-5">
			<button
				onclick={startNewGame}
				class="glass-button px-8 py-4 rounded-xl text-xl text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-md bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-white/30"
			>
				New Game
			</button>
		</div>
		
		<div class="mt-8 p-5 glass-panel rounded-xl border border-white/30 backdrop-blur-md bg-white/10">
			<h3 class="text-white mb-4 font-semibold text-lg">How to Play:</h3>
			<ul class="list-inside text-white/90 space-y-2 text-sm">
				<li>Choose your preferred number of digits (2-5) and max attempts (3-20)</li>
				<li>Guess the number within your attempt limit</li>
				<li><strong>Correct Digits:</strong> How many digits are in the target number (regardless of position)</li>
				<li><strong>Correct Positions:</strong> How many digits are in the correct position</li>
				<li>Example: Target is 401, you guess 410 → 3 correct digits, 1 correct position</li>
			</ul>
		</div>
	</div>
</div>

{#if showSettings}
	<SettingsModal onclose={closeSettings} />
{/if}

<style>
	.glass-container {
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
	}
	
	.glass-panel {
		box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.2);
	}
	
	.glass-button:hover {
		background: rgba(255, 255, 255, 0.3);
		box-shadow: 0 8px 24px 0 rgba(31, 38, 135, 0.3);
	}
</style>

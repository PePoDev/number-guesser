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

<div class="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center p-5">
	<div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative">
		<button
			onclick={openSettings}
			class="absolute top-5 right-5 bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl hover:bg-purple-700 transition-all duration-300 hover:rotate-90 hover:scale-110 shadow-lg cursor-pointer z-10"
			title="Game Settings"
			aria-label="Open Settings"
		>
			<span class="pointer-events-none">⚙️</span>
		</button>
		
		<h1 class="text-center text-gray-800 mb-5 text-4xl font-bold drop-shadow-md">
			Number Guessing Game
		</h1>
		
		<div class="text-center mb-8 p-4 bg-gray-50 rounded-lg border-l-4 border-purple-600">
			<p class="my-1 text-gray-700">
				I'm thinking of a <span class="font-bold text-red-500 text-xl">{$gameStore.settings.digitCount}</span>-digit number. Can you guess it?
			</p>
			{#if $gameStore.mode === 'single'}
				<p class="my-1 text-gray-700">
					You have <span class="font-bold text-red-500 text-xl">{$gameStore.attemptsLeft}</span> attempts remaining.
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
				class="bg-green-600 text-white px-8 py-4 rounded-lg text-xl hover:bg-green-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
			>
				New Game
			</button>
		</div>
		
		<div class="mt-8 p-5 bg-gray-50 rounded-lg border-l-4 border-green-600">
			<h3 class="text-gray-800 mb-4 font-semibold">How to Play:</h3>
			<ul class="list-inside text-gray-700 space-y-2">
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

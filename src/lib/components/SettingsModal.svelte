<script lang="ts">
	import { gameStore } from '$lib/stores/gameStore';
	
	interface Props {
		onclose: () => void;
	}
	
	let { onclose }: Props = $props();
	
	let mode = $state($gameStore.mode);
	let digitCount = $state($gameStore.settings.digitCount);
	let maxAttempts = $state($gameStore.settings.maxAttempts);
	let playerCount = $state($gameStore.settings.playerCount);
	
	function updateGameMode() {
		gameStore.setMode(mode);
		updateSettings();
	}
	
	function updateSettings() {
		gameStore.updateSettings({
			digitCount,
			maxAttempts,
			playerCount
		});
		gameStore.startNewGame();
	}
	
	function handleClose() {
		onclose();
	}
	
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

<div
	class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Escape' && handleClose()}
>
	<div class="bg-white rounded-2xl w-11/12 max-w-lg shadow-2xl animate-modal-slide-in">
		<div class="flex justify-between items-center p-6 border-b-2 border-gray-100 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
			<h3 class="text-2xl font-semibold">Game Settings</h3>
			<button
				onclick={handleClose}
				class="text-white text-3xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-300 hover:scale-110"
			>
				×
			</button>
		</div>
		
		<div class="p-6 space-y-5">
			<div class="flex justify-between items-center">
				<label for="game-mode" class="font-bold text-gray-700 text-lg">Game Mode:</label>
				<select
					id="game-mode"
					bind:value={mode}
					onchange={updateGameMode}
					class="px-4 py-2 border-2 border-gray-300 rounded-lg text-base bg-white cursor-pointer transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
				>
					<option value="single">Single Player</option>
					<option value="multi">Multi Player</option>
				</select>
			</div>
			
			{#if mode === 'multi'}
				<div class="flex justify-between items-center">
					<label for="player-count" class="font-bold text-gray-700 text-lg">Number of Players:</label>
					<select
						id="player-count"
						bind:value={playerCount}
						onchange={updateSettings}
						class="px-4 py-2 border-2 border-gray-300 rounded-lg text-base bg-white cursor-pointer transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
					>
						<option value={2}>2 players</option>
						<option value={3}>3 players</option>
						<option value={4}>4 players</option>
					</select>
				</div>
			{/if}
			
			<div class="flex justify-between items-center">
				<label for="digit-count" class="font-bold text-gray-700 text-lg">Number of Digits:</label>
				<select
					id="digit-count"
					bind:value={digitCount}
					onchange={updateSettings}
					class="px-4 py-2 border-2 border-gray-300 rounded-lg text-base bg-white cursor-pointer transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
				>
					<option value={2}>2 digits</option>
					<option value={3}>3 digits</option>
					<option value={4}>4 digits</option>
					<option value={5}>5 digits</option>
				</select>
			</div>
			
			{#if mode === 'single'}
				<div class="flex justify-between items-center">
					<label for="max-attempts" class="font-bold text-gray-700 text-lg">Max Attempts:</label>
					<select
						id="max-attempts"
						bind:value={maxAttempts}
						onchange={updateSettings}
						class="px-4 py-2 border-2 border-gray-300 rounded-lg text-base bg-white cursor-pointer transition-all duration-300 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
					>
						<option value={3}>3 attempts</option>
						<option value={5}>5 attempts</option>
						<option value={7}>7 attempts</option>
						<option value={10}>10 attempts</option>
						<option value={15}>15 attempts</option>
						<option value={20}>20 attempts</option>
					</select>
				</div>
			{/if}
		</div>
		
		<div class="p-6 border-t-2 border-gray-100 text-center bg-gray-50 rounded-b-2xl">
			<button
				onclick={handleClose}
				class="bg-green-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-green-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
			>
				Close
			</button>
		</div>
	</div>
</div>

<style>
	@keyframes modal-slide-in {
		from {
			opacity: 0;
			transform: translateY(-50px) scale(0.9);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	
	.animate-modal-slide-in {
		animation: modal-slide-in 0.3s ease-out;
	}
</style>
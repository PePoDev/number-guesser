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
    class="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
>
    <div class="w-11/12 max-w-lg shadow-2xl animate-modal-slide-in backdrop-blur-xl bg-white/20 border border-white/30 rounded-3xl">
        <div class="flex justify-between items-center p-6 border-b-2 border-white/20 backdrop-blur-md bg-gradient-to-r from-purple-500/40 to-purple-700/40 text-white rounded-t-3xl">
            <h3 class="text-2xl font-semibold drop-shadow-lg">Game Settings</h3>
            <button
                onclick={handleClose}
                class="text-white text-3xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110"
            >
                ×
            </button>
        </div>
        
        <div class="p-6 space-y-5">
            <div class="flex justify-between items-center">
                <label for="game-mode" class="font-bold text-white text-lg drop-shadow-lg">Game Mode:</label>
                <select
                    id="game-mode"
                    bind:value={mode}
                    onchange={updateGameMode}
                    class="px-4 py-2 rounded-xl text-base cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white font-semibold shadow-lg"
                >
                    <option value="single">Single Player</option>
                    <option value="multi">Multi Player</option>
                </select>
            </div>
            
            {#if mode === 'multi'}
                <div class="flex justify-between items-center">
                    <label for="player-count" class="font-bold text-white text-lg drop-shadow-lg">Number of Players:</label>
                    <select
                        id="player-count"
                        bind:value={playerCount}
                        onchange={updateSettings}
                        class="px-4 py-2 rounded-xl text-base cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white font-semibold shadow-lg"
                    >
                        <option value={2}>2 players</option>
                        <option value={3}>3 players</option>
                        <option value={4}>4 players</option>
                    </select>
                </div>
            {/if}
            
            <div class="flex justify-between items-center">
                <label for="digit-count" class="font-bold text-white text-lg drop-shadow-lg">Number of Digits:</label>
                <select
                    id="digit-count"
                    bind:value={digitCount}
                    onchange={updateSettings}
                    class="px-4 py-2 rounded-xl text-base cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white font-semibold shadow-lg"
                >
                    <option value={2}>2 digits</option>
                    <option value={3}>3 digits</option>
                    <option value={4}>4 digits</option>
                    <option value={5}>5 digits</option>
                </select>
            </div>
            
            {#if mode === 'single'}
                <div class="flex justify-between items-center">
                    <label for="max-attempts" class="font-bold text-white text-lg drop-shadow-lg">Max Attempts:</label>
                    <select
                        id="max-attempts"
                        bind:value={maxAttempts}
                        onchange={updateSettings}
                        class="px-4 py-2 rounded-xl text-base cursor-pointer transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-white/30 backdrop-blur-md bg-white/20 border border-white/30 text-white font-semibold shadow-lg"
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
        
        <div class="p-6 border-t-2 border-white/20 text-center backdrop-blur-md bg-white/10 rounded-b-3xl">
            <button
                onclick={handleClose}
                class="px-8 py-3 rounded-xl text-lg text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg backdrop-blur-md bg-gradient-to-r from-green-400/30 to-emerald-500/30 border border-white/30"
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
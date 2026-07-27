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
    let scrimEl: HTMLDivElement | undefined = $state(undefined);
    let previouslyFocused: HTMLElement | null = null;
    
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
    
    function focusableElements(): HTMLElement[] {
        if (!scrimEl) return [];
        return Array.from(
            scrimEl.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => !el.hasAttribute('disabled'));
    }
    
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
            return;
        }
        if (e.key !== 'Tab') return;
        const focusables = focusableElements();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !scrimEl?.contains(active))) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && (active === last || !scrimEl?.contains(active))) {
            e.preventDefault();
            first.focus();
        }
    }
    
    $effect(() => {
        previouslyFocused = document.activeElement as HTMLElement | null;
        focusableElements()[0]?.focus();
        return () => {
            previouslyFocused?.focus();
        };
    });
</script>

<div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
    onkeydown={handleKeydown}
    bind:this={scrimEl}
>
    <div class="panel animate-modal-slide-in w-full max-w-[480px]">
        <div class="flex items-center justify-between border-b-[1.5px] border-[var(--glass-border)] p-5">
            <h3 id="settings-title" class="font-display text-xl font-bold">Game Settings</h3>
            <button
                onclick={handleClose}
                class="btn-secondary flex !min-h-0 h-10 w-10 items-center justify-center rounded-full !p-0 text-2xl"
                aria-label="Close settings"
            >
                ×
            </button>
        </div>
        
        <div class="space-y-5 p-5">
            <div class="flex items-center justify-between gap-4">
                <label for="game-mode" class="font-semibold">Game Mode:</label>
                <select
                    id="game-mode"
                    bind:value={mode}
                    onchange={updateGameMode}
                    class="field-select"
                >
                    <option value="single">Single Player</option>
                    <option value="multi">Local Multiplayer</option>
                    <option value="online">Online Multiplayer</option>
                </select>
            </div>
            
            {#if mode === 'multi' || mode === 'online'}
                <div class="flex items-center justify-between gap-4">
                    <label for="player-count" class="font-semibold">Number of Players:</label>
                    <select
                        id="player-count"
                        bind:value={playerCount}
                        onchange={updateSettings}
                        class="field-select"
                    >
                        <option value={2}>2 players</option>
                        <option value={3}>3 players</option>
                        <option value={4}>4 players</option>
                    </select>
                </div>
            {/if}
            
            <div class="flex items-center justify-between gap-4">
                <label for="digit-count" class="font-semibold">Number of Digits:</label>
                <select
                    id="digit-count"
                    bind:value={digitCount}
                    onchange={updateSettings}
                    class="field-select"
                >
                    <option value={2}>2 digits</option>
                    <option value={3}>3 digits</option>
                    <option value={4}>4 digits</option>
                    <option value={5}>5 digits</option>
                </select>
            </div>
            
            {#if mode === 'single'}
                <div class="flex items-center justify-between gap-4">
                    <label for="max-attempts" class="font-semibold">Max Attempts:</label>
                    <select
                        id="max-attempts"
                        bind:value={maxAttempts}
                        onchange={updateSettings}
                        class="field-select"
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
        
        <div class="border-t-[1.5px] border-[var(--glass-border)] p-5 text-center">
            <button onclick={handleClose} class="btn-primary px-8">
                Close
            </button>
        </div>
    </div>
</div>

<style>
	@keyframes modal-slide-in {
		from {
			opacity: 0;
			transform: translateY(-12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-modal-slide-in {
		animation: modal-slide-in var(--motion-duration) var(--motion-easing);
	}
</style>

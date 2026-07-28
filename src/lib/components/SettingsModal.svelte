<script lang="ts">
    import { gameStore, type GameMode } from '$lib/stores/gameStore';
    
    interface Props {
        mode: GameMode;
        onclose: () => void;
    }
    
    let { mode, onclose }: Props = $props();
    
    let digitCount = $state($gameStore.settings.digitCount);
    let maxAttempts = $state($gameStore.settings.maxAttempts);
    let playerCount = $state($gameStore.settings.playerCount);
    let scrimEl: HTMLDivElement | undefined = $state(undefined);
    let previouslyFocused: HTMLElement | null = null;
    
    const titles: Record<GameMode, string> = {
        single: 'Single Player Settings',
        multi: 'Local Multiplayer Settings',
        online: 'Online Multiplayer Settings'
    };
    
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
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--scrim-bg)] p-4 backdrop-blur-md"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
    onkeydown={handleKeydown}
    bind:this={scrimEl}
>
    <div class="panel animate-modal-slide-in my-auto w-full max-w-[480px]">
        <div class="flex items-center justify-between border-b-[1.5px] border-[var(--glass-border)] p-5">
            <h2 id="settings-title" class="font-display text-2xl font-bold">{titles[mode]}</h2>
            <button
                onclick={handleClose}
                class="btn-secondary flex h-12 w-12 items-center justify-center rounded-full !p-0"
                aria-label="Close settings"
            >
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
            </button>
        </div>
        
        <div class="space-y-5 p-5">
            {#if mode === 'multi' || mode === 'online'}
                <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label for="player-count" class="font-semibold">Number of Players:</label>
                    <select
                        id="player-count"
                        bind:value={playerCount}
                        onchange={updateSettings}
                        class="field-select w-full sm:w-auto"
                    >
                        <option value={2}>2 players</option>
                        <option value={3}>3 players</option>
                        <option value={4}>4 players</option>
                    </select>
                </div>
            {/if}
            
            <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <label for="digit-count" class="font-semibold">Number of Digits:</label>
                <select
                    id="digit-count"
                    bind:value={digitCount}
                    onchange={updateSettings}
                    class="field-select w-full sm:w-auto"
                >
                    <option value={2}>2 digits</option>
                    <option value={3}>3 digits</option>
                    <option value={4}>4 digits</option>
                    <option value={5}>5 digits</option>
                </select>
            </div>
            
            {#if mode === 'single'}
                <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label for="max-attempts" class="font-semibold">Max Attempts:</label>
                    <select
                        id="max-attempts"
                        bind:value={maxAttempts}
                        onchange={updateSettings}
                        class="field-select w-full sm:w-auto"
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

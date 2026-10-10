<script lang="ts">
    import { gameStore, type GameMode } from '$lib/stores/gameStore';
    import { messages } from '$lib/i18n/messages';
    
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
    
    const t = $derived(messages[$gameStore.locale]);
    
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
            <h2 id="settings-title" class="font-display text-2xl font-bold">{t.settings.titles[mode]}</h2>
            <button
                onclick={handleClose}
                class="btn-secondary flex h-12 w-12 items-center justify-center rounded-full !p-0"
                aria-label={t.settings.closeLabel}
            >
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
            </button>
        </div>
        
        <div class="space-y-5 p-5">
            {#if mode === 'multi' || mode === 'online'}
                <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label for="player-count" class="font-semibold">{t.settings.players}</label>
                    <select
                        id="player-count"
                        bind:value={playerCount}
                        onchange={updateSettings}
                        class="field-select w-full sm:w-auto"
                    >
                        {#each [2, 3, 4] as count}
                            <option value={count}>{t.settings.playerOption(count)}</option>
                        {/each}
                    </select>
                </div>
            {/if}
            
            <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <label for="digit-count" class="font-semibold">{t.settings.digits}</label>
                <select
                    id="digit-count"
                    bind:value={digitCount}
                    onchange={updateSettings}
                    class="field-select w-full sm:w-auto"
                >
                    {#each [2, 3, 4, 5] as count}
                        <option value={count}>{t.settings.digitOption(count)}</option>
                    {/each}
                </select>
            </div>
            
            {#if mode === 'single'}
                <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label for="max-attempts" class="font-semibold">{t.settings.attempts}</label>
                    <select
                        id="max-attempts"
                        bind:value={maxAttempts}
                        onchange={updateSettings}
                        class="field-select w-full sm:w-auto"
                    >
                        {#each [3, 5, 7, 10, 15, 20] as count}
                            <option value={count}>{t.settings.attemptOption(count)}</option>
                        {/each}
                    </select>
                </div>
            {/if}
        </div>
        
        <div class="border-t-[1.5px] border-[var(--glass-border)] p-5 text-center">
            <button onclick={handleClose} class="btn-primary px-8">
                {t.settings.close}
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

// Vitest runs components without the SvelteKit router; this stands in for the
// parts of $app/navigation that components call.
export function replaceState(url: string | URL, state: App.PageState): void {
	window.history.replaceState(state, '', url)
}

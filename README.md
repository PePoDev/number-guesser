# Number Guessing Game

> **This file is the single source of truth for both humans and AI agents working on this project.**
> An AI agent reading this file should treat every section below as binding context. Humans can ignore the "For AI Agents" sections.

A modern, interactive number-guessing game built with **SvelteKit 2** and **Tailwind CSS 4**. Two game modes (single player and multiplayer), customizable difficulty, and a deliberate, editorial visual design.

🎮 **[Play the live demo](https://number-guesser.pepo.dev)**

> **Visual design lives in [`DESIGN.md`](DESIGN.md).** Read it before making any UI change. Do not introduce visual decisions in code that are not already in `DESIGN.md`.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Game Modes](#game-modes)
- [How to Play](#how-to-play)
- [Technical Specifications](#technical-specifications)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [For AI Agents](#for-ai-agents)
- [Appendix: Visual Design Summary](#appendix-visual-design-summary)

---

## Overview

A web-based puzzle game. The player (or players) try to guess a secret number within a limited number of attempts. Each guess returns two pieces of feedback:

- **Correct digits** — how many of the digits in your guess appear anywhere in the target number.
- **Correct positions** — how many of your digits are in the exact right position.

### Highlights

- **Two game modes** — single player vs. the computer, and 2–4 player competitive multiplayer.
- **Customizable difficulty** — 2–5 digit numbers, 3–20 attempts (single player only).
- **Real-time feedback** — every guess returns both counts.
- **Editorial visual design** — see `DESIGN.md`.
- **Responsive** — mobile, tablet, desktop.
- **Accessible** — keyboard navigable, WCAG AA contrast.
- **Tested** — unit, component, and end-to-end.

---

## Features

### Game

- 🎮 **Single player** — guess a randomly generated number.
- 👥 **Multiplayer** — each player picks a secret number, players take turns guessing each other's numbers; the last un-guessed player wins.
- ⚙️ **Configurable** — digit count (2–5), max attempts (3–20), player count (2–4).
- 📜 **Guess history** — every previous guess is visible with its feedback.
- 🚫 **Duplicate detection** — guessing the same number twice does not cost an attempt (single player only).
- ⌨️ **Keyboard support** — `Enter` submits a guess; `Escape` closes the settings modal.

### Design

- **Single-stage layout** — the whole game lives on one screen, no nested panels.
- **Numbered nav rail** — left rail with colored, labeled cards for each section.
- **Top ticker** — a slowly scrolling band of feature labels.
- **Cream glass panel** — the play area, framed by a dark border.
- **Hero visual** — an infinite perspective tunnel of colored and numbered tiles.
- **Reduced motion** — ticker and transitions are disabled when the user prefers reduced motion.

See `DESIGN.md` for the full design system.

---

## Game Modes

### Single player

- The computer picks a random number with the configured digit count.
- You have a configurable number of attempts (default 7).
- After each guess you see the **correct digits** and **correct positions** counts.
- You win by guessing the number exactly; you lose by running out of attempts.
- Duplicate guesses are rejected and do not consume an attempt.

### Multiplayer

- **Setup phase:** each player enters a name and a secret number.
- **Guessing phase:** players take turns guessing *another* player's secret number. A correct guess eliminates that player; a wrong guess passes the turn to the next active player.
- **End:** the last player whose number has not been guessed wins.

---

## How to Play

1. Pick your mode and settings (digit count, attempts, player count) in the settings modal.
2. The computer (or, in multiplayer, the next player in turn) shows the digit count.
3. Enter a guess. The feedback tells you:
   - **Correct digits** — how many of your digits appear anywhere in the target.
   - **Correct positions** — how many are in the right slot.
4. Use the feedback to narrow down the number.
5. Guess the exact number to win.

### Example

- **Target:** `401`
- **Your guess:** `410`
- **Feedback:** `3 correct digits, 1 correct position`
- **Why:** all three digits (4, 1, 0) are in the target, but only the `4` is in the correct position.

---

## Technical Specifications

| Concern | Choice |
| --- | --- |
| Framework | SvelteKit 2 (Svelte 5 with Runes) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + a small set of custom CSS variables in `src/app.css` |
| State | Svelte stores (`writable` + `$state` / `$effect` for component-local state) |
| Build | Vite 7 |
| Package manager | pnpm |
| Unit / component tests | Vitest + `@testing-library/svelte` + jsdom |
| End-to-end tests | Playwright (Chromium) |
| Static export | `@sveltejs/adapter-static` |
| Hosting | GitHub Pages, custom domain `number-guesser.pepo.dev` |

### Browser support

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.
- The visual design uses `backdrop-filter` for the glass panel — supported in all of the above.

---

## Project Structure

```
number-guessing/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── SinglePlayerGame.svelte
│   │   │   ├── SinglePlayerGame.test.ts
│   │   │   ├── MultiPlayerGame.svelte
│   │   │   ├── MultiPlayerGame.test.ts
│   │   │   ├── SettingsModal.svelte
│   │   │   └── SettingsModal.test.ts
│   │   ├── stores/
│   │   │   ├── gameStore.ts
│   │   │   └── gameStore.test.ts
│   │   ├── assets/
│   │   │   └── favicon.svg
│   │   └── index.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.js
│   │   ├── +page.svelte
│   │   └── page.test.ts
│   ├── tests/
│   │   └── setup.ts
│   ├── app.css           # global tokens + glass utility + motion baseline
│   ├── app.d.ts
│   └── app.html
├── e2e/
│   ├── single-player.spec.ts
│   └── multiplayer.spec.ts
├── static/
│   ├── CNAME
│   ├── favicon.svg
│   └── robots.txt
├── docs/
│   └── DUPLICATE_GUESS_FEATURE.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── DESIGN.md             # visual design system
├── TESTING.md            # testing strategy and conventions
├── README.md             # ← you are here (this file is the source of truth)
├── svelte.config.js
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── pnpm-lock.yaml
```

### Key files

- [`src/lib/stores/gameStore.ts`](src/lib/stores/gameStore.ts) — single source of game state. `validateGuess`, `calculateFeedback`, and the random-number generator are exported pure functions; the store wraps them in a `writable` and exposes intent-based actions (`startNewGame`, `addGuess`, `savePlayerSetup`, `addMultiPlayerGuess`, `nextGuesser`).
- [`src/routes/+page.svelte`](src/routes/+page.svelte) — the stage. Layout, ticker, nav rail, glass panel, hero visual, and bottom utility row.
- [`src/lib/components/SinglePlayerGame.svelte`](src/lib/components/SinglePlayerGame.svelte) — the single-player surface (input, submit, feedback, history, win/lose banners).
- [`src/lib/components/MultiPlayerGame.svelte`](src/lib/components/MultiPlayerGame.svelte) — the multiplayer surface (setup form, player cards, target picker, guess history per player).
- [`src/lib/components/SettingsModal.svelte`](src/lib/components/SettingsModal.svelte) — game settings dialog (mode, digit count, attempts, player count).
- [`src/app.css`](src/app.css) — design tokens (CSS custom properties), the glass utility class, scrollbar styling, motion baseline, focus-ring reset.
- [`DESIGN.md`](DESIGN.md) — the visual design system. **Read this before changing UI.**
- [`TESTING.md`](TESTING.md) — testing strategy, layout, and conventions.

---

## Setup & Installation

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm

### Quick start

```bash
git clone https://github.com/yourusername/number-guessing.git
cd number-guessing
pnpm install
pnpm run dev
```

Open <http://localhost:5173>.

### Build for production

```bash
pnpm run build       # outputs to ./build
pnpm run preview     # serves the build locally
```

---

## Development

### Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the Vite dev server with HMR |
| `pnpm build` | Build the static site to `./build` |
| `pnpm preview` | Serve the built site locally |
| `pnpm check` | Type-check the Svelte + TypeScript code |
| `pnpm check:watch` | Type-check in watch mode |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm test:run` | Run Vitest once |
| `pnpm test:ui` | Open the Vitest UI |
| `pnpm test:coverage` | Run Vitest with coverage |
| `pnpm test:e2e` | Run the Playwright suite |
| `pnpm test:e2e:ui` | Open the Playwright UI |
| `pnpm test:all` | Run unit + component + e2e tests |

### Code conventions

- **TypeScript everywhere.** No `any` in new code. `unknown` + a narrowing helper is fine.
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`) for component-local state. Stores are still `writable` for cross-component state.
- **Tailwind for layout and spacing, CSS custom properties for color.** Do not hardcode hex values in components — extend the tokens in `src/app.css` and reference them.
- **No new dependencies** without a clear justification in the PR. Default to the standard library and what Svelte/Tailwind already give us.
- **No comments in code** unless the comment explains *why*, not *what*. Code should read as documentation.
- **Tests accompany every change.** A new exported function in `gameStore.ts` gets a unit test. A new component gets a component test. A new user-visible flow gets an e2e test.

### Adding a feature

1. Read `DESIGN.md`. If the feature introduces a new visual surface, add it to `DESIGN.md` in the same PR.
2. If the feature changes the game state, extend `gameStore.ts` with a new intent-based action and a unit test in `gameStore.test.ts`.
3. If the feature is UI-only, implement it in the appropriate component under `src/lib/components/`.
4. Add a component test next to the component.
5. If the feature changes a user-visible flow, add an e2e test under `e2e/`.
6. Run `pnpm check` and `pnpm test:all` before opening the PR.

---

## Testing

Full testing strategy, layout, and best practices: see [`TESTING.md`](TESTING.md).

### Quick run

```bash
pnpm test                # unit + component, watch
pnpm test:run            # unit + component, single run
pnpm test:coverage       # with coverage
pnpm test:e2e            # Playwright
pnpm test:all            # everything
```

### Layout

- **Unit** — `src/lib/stores/gameStore.test.ts` (pure functions).
- **Component** — one `*.test.ts` next to each `*.svelte` under `src/lib/components/`.
- **E2E** — `e2e/single-player.spec.ts`, `e2e/multiplayer.spec.ts`.
- **Setup** — `src/tests/setup.ts` (jsdom + jest-dom matchers).

---

## Deployment

Deployed to **GitHub Pages** at <https://number-guesser.pepo.dev>.

- The `static/CNAME` file pins the custom domain.
- `@sveltejs/adapter-static` produces a fully static build in `./build`.
- `.github/workflows/deploy.yml` builds and publishes on push to `main`.
- Configure the custom domain's DNS to point to GitHub Pages.

To deploy from a fork, update `static/CNAME` and the workflow accordingly.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/<short-name>`.
3. Make your changes. **Read `DESIGN.md` before touching UI.** Read `TESTING.md` before writing tests.
4. Add or update tests for every change.
5. Run `pnpm check && pnpm test:all`.
6. Open a pull request with a clear description of the change and a screenshot for any UI change.

### Bug reports

Please include: browser + version, steps to reproduce, expected vs. actual, screenshot if applicable.

---

## License

MIT. See [`LICENSE`](LICENSE).

---

# For AI Agents

> **Read this entire section before doing anything in this repo.** It is the contract between you and the project owner.

## 1. Project at a glance

- **Type:** SvelteKit 2 + Svelte 5 (Runes) + TypeScript + Tailwind 4 static site.
- **Purpose:** A small number-guessing puzzle game. Single player and 2–4 player multiplayer.
- **Hosting:** GitHub Pages, static export. **No server, no API, no database.**
- **Domain:** `number-guesser.pepo.dev`
- **Repo root:** this directory.
- **Source of truth for visuals:** [`DESIGN.md`](DESIGN.md). **The visual design is deliberate; do not "improve" it without updating `DESIGN.md` first.**
- **Source of truth for testing:** [`TESTING.md`](TESTING.md).

## 2. Commands (cheat sheet)

```bash
pnpm install          # install deps
pnpm dev              # dev server, http://localhost:5173
pnpm build            # static build to ./build
pnpm preview          # serve the build
pnpm check            # type-check (run before any commit)
pnpm test:run         # unit + component tests, single run
pnpm test             # unit + component tests, watch
pnpm test:coverage    # with v8 coverage
pnpm test:e2e         # Playwright (builds first)
pnpm test:all         # unit + component + e2e
```

**Pre-commit minimum:** `pnpm check` and `pnpm test:run` must both pass.

## 3. The contract

You are bound by the following rules. Breaking any of them is grounds for a rejected PR.

### 3.1 Never

- **Do not introduce a new dependency** without the owner explicitly asking for it. If you need a function, check the standard library, then Svelte, then Tailwind, then existing deps in `package.json`.
- **Do not add a comment that explains what the code does.** Comments explain *why*, not *what*. Self-evident code needs no comment.
- **Do not use `any`.** Use `unknown` and narrow, or define a type.
- **Do not hardcode colors, spacing, or font sizes in components.** Use the tokens in `src/app.css` and `DESIGN.md`.
- **Do not modify the visual design outside of `DESIGN.md`.** If you need to change a color, add a state, or introduce a new component, update `DESIGN.md` in the same change.
- **Do not add a CI workflow, change the deploy target, or touch GitHub settings** without asking.
- **Do not commit secrets, tokens, or `.env` files.** None are needed for this project.
- **Do not amend a previous commit** unless the owner explicitly asks.
- **Do not force-push.**
- **Do not introduce tests that depend on network, real time, or randomness without seeding.** Use `vi.useFakeTimers()` and seed `Math.random` if you must.
- **Do not introduce a global state mutation outside of `src/lib/stores/gameStore.ts`.** If you need new state, add an action to the store and call it from the component.
- **Do not add a `console.log`.** If you need to debug, remove the log before committing.

### 3.2 Always

- **Always run `pnpm check` and `pnpm test:run` before claiming a task is done.** No "I think it works." Verification first, assertions second.
- **Always read `DESIGN.md` before touching a `.svelte` file under `src/`.**
- **Always read `TESTING.md` before writing tests.**
- **Always add or update tests for the change you made.** A new exported function gets a unit test. A new branch in a component gets a component test. A new user-visible flow gets an e2e test.
- **Always match the existing code style:** tabs for indentation in `.svelte` and `.ts`, single quotes, semicolons off (TS), trailing commas in multi-line.
- **Always keep the build green.** If you must land a partial change, leave the test for the partial piece and mark it with a `// TODO:` block that names the blocker.
- **Always prefer the smallest change that solves the problem.** No speculative abstractions, no "while I'm here" refactors.
- **Always update `DESIGN.md` when introducing a new surface, token, or interaction pattern.** Add a row to §10 (File-to-Design Map) and a line to §11 (Decision Log).

## 4. Architecture map

This is the mental model. Keep it in your head while you work.

### 4.1 Layers

```
┌────────────────────────────────────────────────────────────┐
│ Routes (src/routes/)                                       │
│   +page.svelte  — the stage, composes everything            │
│   +layout.svelte — loads app.css                           │
│   +layout.js    — prerender config                         │
└────────────────────────┬───────────────────────────────────┘
                         │ uses
┌────────────────────────▼───────────────────────────────────┐
│ Components (src/lib/components/)                            │
│   SinglePlayerGame, MultiPlayerGame, SettingsModal         │
│   — own component-local UI state, delegate game state to   │
│     the store                                              │
└────────────────────────┬───────────────────────────────────┘
                         │ uses
┌────────────────────────▼───────────────────────────────────┐
│ Store (src/lib/stores/gameStore.ts)                         │
│   — single writable holding the entire GameState           │
│   — exposes intent-based actions                           │
│   — exports pure helpers: validateGuess,                   │
│     calculateFeedback, generateRandomNumber                │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Game state shape

```ts
type GameMode = "single" | "multi";
type GamePhase = "setup" | "guessing" | "finished";

interface GameSettings { digitCount: number; maxAttempts: number; playerCount: number; }
interface SinglePlayerGuess { guess: string; correctDigits: number; correctPositions: number; }
interface GuessEntry { guesser: number; target: number; guess: string; correct: boolean; correctDigits: number; correctPositions: number; }
interface Player { id: number; name: string; number: string; guesses: GuessEntry[]; eliminated: boolean; }

interface GameState {
  mode: GameMode;
  settings: GameSettings;
  targetNumber: string;         // single player only
  attemptsLeft: number;         // single player only
  gameOver: boolean;
  guessHistory: SinglePlayerGuess[];   // single player only
  players: Player[];                    // multiplayer only
  currentSetupPlayer: number;           // multiplayer only
  currentGuesser: number;               // multiplayer only
  gamePhase: GamePhase;                 // multiplayer only
  activePlayers: number[];              // multiplayer only
}
```

### 4.3 Where to put new code

- **A new pure function** (e.g. a scoring variant) → `src/lib/stores/gameStore.ts`, exported, with a unit test in `gameStore.test.ts`.
- **A new store action** → `src/lib/stores/gameStore.ts`, with a unit test that calls the action and asserts the resulting state.
- **A new component** → `src/lib/components/<Name>.svelte` + a colocated `<Name>.test.ts`. Keep it small; one screen, one component.
- **A new global token** → `src/app.css` as a CSS custom property on `:root`, then documented in `DESIGN.md` §3 or §4.
- **A new e2e flow** → `e2e/<flow>.spec.ts`. Reuse page objects if the flow shares steps with existing specs.

## 5. Common tasks (copy-paste recipes)

### 5.1 Add a new game mode

1. Add the mode to `GameMode` in `gameStore.ts`.
2. Extend `startNewGame` to initialize the mode's state.
3. Add a "phase" if the mode is multi-step; add to `GamePhase`.
4. Create `src/lib/components/<Mode>Game.svelte`.
5. In `src/routes/+page.svelte`, branch on `$gameStore.mode` to render the new component.
6. Add the new mode to the settings modal.
7. Add the new mode to the nav rail in `+page.svelte` (pick a free accent color from `DESIGN.md` §3.2 or extend it).
8. Update `DESIGN.md` §5 (Components) and §10 (File-to-Design Map).
9. Tests: unit in `gameStore.test.ts`, component for the new component, e2e for the happy path.

### 5.2 Add a new visual token

1. Add the CSS custom property to `:root` in `src/app.css` with a comment naming the token and its source.
2. Reference the variable (not a raw value) in the component.
3. Add the token to `DESIGN.md` §3 (Color Tokens) or §4 (Typography) with a one-line usage note.
4. If Tailwind needs to expose it as a utility, extend `tailwind.config.js` `theme.extend` and document the mapping in `DESIGN.md`.

### 5.3 Add a new component

1. Read `DESIGN.md` §5 to find the closest existing component pattern. Reuse it.
2. Place the file at `src/lib/components/<Name>.svelte`.
3. Use Svelte 5 runes for component-local state; do not introduce a new store.
4. Use the design tokens (CSS variables) — no raw colors.
5. Add `<Name>.test.ts` next to it. Render the component, interact with it, assert on text and ARIA.
6. Add a row to `DESIGN.md` §10.

### 5.4 Change the feedback rules

1. The feedback rules are in `calculateFeedback(guess, target)` in `src/lib/stores/gameStore.ts`. It is pure and fully unit-tested.
2. Update the function, then update its unit tests in `gameStore.test.ts` to cover the new behavior.
3. If the change is user-visible (e.g. a new counter), update `SinglePlayerGame.svelte` and `MultiPlayerGame.svelte` to display it.
4. If the change is purely internal, no UI update is needed; `DESIGN.md` does not need to change.

### 5.5 Investigate a bug

1. Reproduce it as a failing test first (unit, component, or e2e — whichever reproduces fastest).
2. Locate the source: state mutation in the store, or rendering in a component.
3. Fix the source, not the symptom.
4. Keep the failing test as a regression test.

## 6. Definition of done

A change is **done** when **all** of the following are true:

- [ ] `pnpm check` passes with zero errors and zero warnings.
- [ ] `pnpm test:run` passes with zero failures.
- [ ] `pnpm test:e2e` passes for the affected flows (run locally if you have Playwright installed; otherwise state in the PR that the e2e is unverified).
- [ ] `DESIGN.md` is updated if the change touched the visual design, the file map, or the decision log.
- [ ] `TESTING.md` is updated if the change touched the test layout or strategy.
- [ ] The diff is the smallest that solves the problem. No drive-by refactors.
- [ ] No new comments, no `console.log`, no `any`, no hardcoded colors, no new dependencies.
- [ ] The PR description explains the *why*, not just the *what*.

## 7. What to do when something is ambiguous

- The visual design → `DESIGN.md`. If `DESIGN.md` is silent, **propose a token or surface there first, get it merged, then implement.**
- The state model → `gameStore.ts`. If the state model does not support what you need, **extend the state and its tests first, then implement the feature.**
- The test layout → `TESTING.md`.
- Anything else → ask the owner. Do not guess. A wrong guess costs a re-roll; a question costs a minute.

---

## Appendix: Visual Design Summary

A condensed version of `DESIGN.md` for quick reference. The full system, with rationale and file-to-design map, is in [`DESIGN.md`](DESIGN.md).

- **Stage:** blue grid background, single rounded container, three columns (nav / glass / hero), ticker on top, utility row at bottom.
- **Nav rail:** numbered, colored cards (blue / yellow / orange / green) for the four primary sections; purple card is the primary CTA.
- **Glass panel:** cream rounded panel (`#f5efe6`), dark border (`#0b1220`), holds the game UI. Signature move: display heading ends with an italic, yellow-accented word.
- **Hero visual:** infinite perspective tunnel of colored and numbered tiles, decorative only, hidden below 600px.
- **Type:** display family (Space Grotesk 700 or similar) for headings, Inter for everything else. Two families total.
- **State colors:** green = correct, red = incorrect, amber = warning, blue = info. Always used as overlays, never as primary surfaces.
- **Motion:** 180ms `cubic-bezier(0.2, 0.8, 0.2, 1)`. No bounce, no spring, no looping animations except the ticker.
- **Accessibility:** WCAG AA contrast, visible focus rings, keyboard navigable, ticker and hero visual are `aria-hidden`.
- **Tokens:** defined as CSS custom properties on `:root` in `src/app.css`. Never hardcode colors in components.

# Number Guessing Game

A static, interactive number-guessing puzzle built with SvelteKit 2, Svelte 5, TypeScript, and Tailwind CSS 4.

🎮 **[Play the live demo](https://number-guesser.pepo.dev)**

> This README is the single source of truth for the project. Its rules apply to humans and AI agents.

## Game

Players guess a secret 2–5 digit number. Each guess reports:

- **Correct digits** — digits that appear anywhere in the target.
- **Correct positions** — digits in the exact target position.

Example: target `401`, guess `410` → 3 correct digits and 1 correct position.

### Modes

- **Single player:** The computer generates a number. The player has 3–20 attempts, with 7 by default. Duplicate guesses are rejected without consuming an attempt.
- **Local multiplayer:** Two to four players share one device, choose names and secret numbers, and take turns guessing.
- **Online multiplayer:** Two to four remote players enter display names, create or join a room with a six-character ID or invite link, and reconnect after refresh. The host can start once at least two players are ready; anyone not ready is left out. Leaving mid-match forfeits, and if the player whose turn it is stays idle for two minutes, the others can remove them. Firebase keeps secrets private and enforces turns on the server.

Secret-number and guess fields read Thai numerals (๐–๙) as digits, discard other non-digits, and stop at the configured digit count. Every mode requires exactly that many digits; nothing is padded.

`Enter` submits a guess. `Escape` closes the settings modal.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | SvelteKit 2, Svelte 5 runes |
| Language | TypeScript |
| Styling | Tailwind CSS 4 and tokens in `src/app.css` |
| Shared state | Svelte `writable` store |
| Build | Vite 7, `@sveltejs/adapter-static` |
| Unit/component tests | Vitest, Testing Library, jsdom |
| End-to-end tests | Playwright with Chromium |
| Online backend | Firebase Anonymous Auth, Firestore, callable Functions, Admin SDK |
| Firebase tests | Firebase Emulator Suite |
| Hosting | GitHub Pages at `number-guesser.pepo.dev` |
| Localization | English and Thai, typed in-house dictionaries; no i18n dependency |

GitHub Pages serves the static SvelteKit client. Callable Cloud Functions own authoritative online commands; Firestore publishes member-only room projections.

## Quick start

Install Node.js 22 and pnpm 9, then:

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173>.

For online development, install Java 21, then run `pnpm firebase:emulators` and `pnpm dev --mode test` in separate terminals. Test mode uses only the local `demo-number-guessing` project. Production requires a Firestore database, Anonymous Auth, the six public Firebase values from `.env.example`, and Functions in `asia-southeast1`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build the static site to `build/` |
| `pnpm preview` | Preview the production build |
| `pnpm check` | Run Svelte and TypeScript checks |
| `pnpm check:watch` | Run checks in watch mode |
| `pnpm test` | Run unit/component tests in watch mode |
| `pnpm test:run` | Run unit/component tests once |
| `pnpm test:ui` | Open the Vitest UI |
| `pnpm test:coverage` | Generate test coverage |
| `pnpm test:e2e` | Run Playwright tests |
| `pnpm test:e2e:ui` | Open the Playwright UI |
| `pnpm test:e2e:debug` | Debug Playwright tests |
| `pnpm test:all` | Run unit, component, and end-to-end tests |
| `pnpm firebase:emulators` | Start local Auth, Firestore, and Functions emulators |
| `pnpm test:functions` | Run pure Functions tests |
| `pnpm test:firebase` | Run transaction and rules tests in emulators |
| `pnpm test:e2e:online` | Run online flows in separate browser contexts and emulators |

## Architecture

```text
src/routes/
  +layout.svelte               Global styles, locale detection, and <html lang>
  +page.svelte                 Stage and component composition
src/lib/components/
  SinglePlayerGame.svelte      Single-player UI
  MultiPlayerGame.svelte       Multiplayer UI
  OnlineMultiplayerGame.svelte Online room entry, lobby, and synchronized game
  SettingsModal.svelte         Active-mode settings dialog
  GitHubStarLink.svelte        Repository link and best-effort live star count
src/lib/stores/
  gameStore.ts                 All shared game state and logic
src/lib/i18n/
  messages.ts                  English and Thai dictionaries
  locale.ts                    Locale detection and persistence
src/lib/firebase/client.ts      Firebase browser initialization
src/lib/online/types.ts         Public online state types
src/lib/services/
  onlineGameService.ts         Auth, callable, and subscription boundary
  firebaseBackend.ts           Firebase SDK calls, loaded only when a player goes online
functions/                     Server-authoritative room commands
firebase.json                  Emulator and deployment configuration
firestore.rules                Member-only reads and server-only writes
firestore.indexes.json         Firestore query indexes
src/app.css                    Global styles and design tokens
e2e/                           Playwright flows
static/                        CNAME, favicon, robots.txt
```

`gameStore.ts` owns the complete `GameState`: locale, mode, settings, single-player target and history, multiplayer players and turns, phase, active players, and game-over state.

Components keep only local UI state. They call intent-based store actions such as `startNewGame`, `addGuess`, `savePlayerSetup`, `addMultiPlayerGuess`, and `nextGuesser`.

Pure helpers such as `validateGuess`, `calculateFeedback`, `generateRandomNumber`, and `sanitizeDigits` are exported from the store for direct unit testing.

Online rooms are server-authoritative:

- Every command runs in a Firestore transaction and treats a room whose `expiresAt` has passed as missing.
- A room's `match` number increases on each restart, and every guess records its `match`, so a late duplicate restart can only clear guesses from earlier matches. The client shows only the current match's guesses.
- `turnStartedAt` marks when the current turn began. `removeIdlePlayer` forfeits the current guesser after `IDLE_TURN_SECONDS` (120).
- Leaving mid-match forfeits: the player stays in the room with `eliminated` and `left` set, so names and history survive. Restart removes players who left.
- `createRoom` allows 10 rooms per user per rolling hour, tracked in server-only `rateLimits/{uid}`.
- The hourly cleanup deletes expired rooms in pages of 200. It re-checks each room in a transaction and deletes its secrets before the room, so an interrupted run never orphans secrets.

## Localization

The interface ships in English (`en`) and Thai (`th`).

- All user-visible copy lives in `src/lib/i18n/messages.ts`. `en` is the source dictionary and `th` is typed against it, so a missing or mistyped Thai entry fails `pnpm check`.
- Copy that depends on a count or embeds a value is a function. Copy that wraps a highlighted value returns `RichText` parts, and each component renders the value with its own markup.
- `gameStore` owns `locale` and the `setLocale` action. Components read `messages[$gameStore.locale]`.
- On load the root layout uses the saved choice in local storage key `number-guessing-locale`, then the first browser language that starts with `th` or `en`, then English. Choosing a language in Settings saves it.
- The layout keeps `<html lang>` and the page keeps the document title in the active language.
- Stores and services return codes, not copy: `validateGuess` reports a `GuessProblem`, online commands report an `OnlineErrorCode`, and unnamed local players stay blank until a component renders their localized default name.
- Player-entered names, room IDs, numbers, and the `Enter` and `Escape` key names are not translated.

## Rules

These rules are binding. Update this README when a project, testing, or design decision changes.

### Always

- Use TypeScript. Narrow `unknown`; never introduce `any`.
- Use Svelte 5 runes for component-local state and the existing writable store for shared state.
- Put all shared game-state mutations behind intent-based actions in `gameStore.ts`.
- Use Tailwind for layout and spacing, and CSS custom properties for design values.
- Add or update tests for every change.
- Read the Design system before editing a `.svelte` file.
- Keep online secrets out of public Firestore documents, client state, local storage, analytics, and logs.
- Keep the Firebase SDK behind the dynamic import in `onlineGameService.ts`; it is most of the app's JavaScript, and players who never go online should not download it.
- Run Firebase tests only against project `demo-number-guessing`; never connect automated tests to production Firebase.
- Match existing style: tabs in `.svelte` and `.ts`, single quotes, no semicolons in TypeScript, and trailing commas in multiline structures.
- Prefer the smallest change that solves the problem.
- Put every user-visible string in both dictionaries in `src/lib/i18n/messages.ts`.
- Run `pnpm check` and `pnpm test:run` before claiming completion.

### Never

- Add a dependency without explicit owner approval.
- Hardcode colors, spacing, or font sizes in components.
- Hardcode user-facing copy in components, stores, or services.
- Add shared state outside `gameStore.ts`.
- Add comments that explain what code does; comments may explain why.
- Add `console.log`, secrets, tokens, or `.env` files.
- Add tests that depend on unseeded randomness, real time, or the network.
- Change CI, deployment, hosting, or GitHub settings without approval.
- Amend commits or force-push unless explicitly requested.
- Introduce speculative abstractions or unrelated refactors.

Firebase dependencies and backend deployment are explicitly approved for online multiplayer. `.env.example` may contain placeholders; Vite `test` mode uses only checked-in `demo-number-guessing` identifiers.

### Documentation

- A new visual token, surface, state, or interaction must update the Design system and its file map in the same change.
- A new test pattern or layout must update Testing in the same change.
- If this README is silent, document the decision before implementing it.

## Testing

| Layer | Location | Scope |
| --- | --- | --- |
| Unit | `src/lib/stores/gameStore.test.ts` | Pure helpers, state transitions, edge cases |
| Component | Colocated `*.test.ts` files | Rendering, interaction, ARIA, component branches |
| End-to-end | `e2e/*.spec.ts` | Complete single-player and multiplayer flows; `localization.spec.ts` covers Thai browser detection and the saved language |
| Firebase integration | `functions/src/*.test.ts`, `src/lib/firebase/firestore.rules.test.ts` | Emulator-only transactions, cleanup, and security rules |
| Online end-to-end | `e2e/online-multiplayer.spec.ts` | Separate browser contexts for create/join, turns, host and invited-player reconnect, forfeit, starting without unready players, and errors |
| Deployment | `src/tests/deploymentWorkflows.test.ts` | Secret injection, missing-config guard, and Java runtime requirements |
| Localization | `src/lib/i18n/*.test.ts` | Locale resolution, persistence, and dictionary parity |
| Setup | `src/tests/setup.ts`, `src/tests/appNavigation.ts` | DOM environment, matchers, pinned `Math.random`, and a `$app/navigation` stand-in aliased in `vitest.config.ts` |

### Test requirements

- A new exported helper gets a unit test.
- A new component or component branch gets a colocated component test.
- A new user-visible flow gets an end-to-end test.
- A bug starts with the smallest failing regression test.
- Test behavior, not implementation details.
- Use semantic Testing Library queries and Playwright's built-in waiting.
- Cover Thai copy by calling `gameStore.setLocale('th')` before rendering, and browser detection in Playwright with `test.use({ locale: 'th-TH' })`. Clear `localStorage` before tests that render the page so a saved language cannot leak between tests.
- Use fake timers and seeded randomness when needed. `src/tests/setup.ts` pins `Math.random` to 0.5 before every Vitest test, so a three-digit target is `500`; Playwright specs that play single player stub it with `page.addInitScript` before navigation.
- Keep tests independent; avoid arbitrary timeouts.
- Run Firebase tests only with project `demo-number-guessing`, never production services.
- Give every online player a separate Playwright browser context.

### Coverage goals

| Metric | Goal |
| --- | --- |
| Statements | > 80% |
| Branches | > 75% |
| Functions | > 80% |
| Lines | > 80% |

Useful focused commands:

```bash
pnpm vitest src/lib/stores/gameStore.test.ts
pnpm vitest -t "should validate"
pnpm exec playwright test e2e/single-player.spec.ts
pnpm exec playwright test -g "should submit guess"
```

## Design system

The interface should feel like one well-built editorial object, not a dashboard.

### Principles

1. **One stage, one moment.** Keep the whole game in one scene without nested panels or hidden navigation.
2. **Color carries meaning.** Use color for mode, state, player, or action—not decoration.
3. **Honest structure.** Keep hierarchy, controls, focus, and status visible.

### Stage

- A blue grid fills the viewport.
- One dark-bordered rounded container holds a top ticker, three-column body, and bottom utility row with keyboard hints and the current mode.
- The left rail contains three numbered accent cards and a shorter purple primary-action card.
- The center contains the cream glass play panel.
- The right contains a decorative perspective tunnel of numbered tiles.
- The ticker is the only looping animation.

The Multiplayer card opens the last selected multiplayer variant; a segmented control inside the play panel switches between Local and Online. Instructions replaces the center-panel game content. The icon-only Settings (gear) button beside the GitHub link in the panel header is always available. It opens the active mode's game settings plus the language; once an online room exists its rules are fixed, so only the language remains. The purple New Game action is disabled online because the host-owned restart remains inside the online flow.

Desktop columns are a ~140px nav rail, a flexible play area with a 320px minimum, and a hero using about 40% of the remaining width.

The grid is approximately 32×32px on desktop and 24×24px on mobile. Outer radius is about 24px desktop and 16px mobile.

### Color tokens

Define tokens on `:root` in `src/app.css`. Components must reference tokens, never raw values.

| Token | Value | Use |
| --- | --- | --- |
| `--stage-bg` | `#1d4ed8` | Grid field |
| `--stage-grid` | `rgba(255,255,255,0.18)` | Grid lines |
| `--stage-border` | `#0b1220` | Borders and dark CTA |
| `--ticker-bg` | `#1e40af` | Ticker |
| `--ticker-fg` | `#fef3c7` | Ticker text |
| `--glass-bg` | `#f5efe6` | Play panel |
| `--glass-border` | `#0b1220` | Panel and control borders |
| `--glass-fg` | `#0b1220` | Primary panel text |
| `--glass-muted` | `#5b6478` | Secondary text |
| `--glass-accent` | `#facc15` | Highlighted values |
| `--surface-white` | `#ffffff` | Inputs, secondary controls, and translucent surfaces |
| `--scrim-bg` | `rgba(0,0,0,0.4)` | Settings modal backdrop |

Accent cards map blue to single player, yellow to multiplayer, orange to instructions, and purple to the primary action.

| Token | Value |
| --- | --- |
| `--accent-blue` | `#2563eb` |
| `--accent-yellow` | `#facc15` |
| `--accent-orange` | `#f97316` |
| `--accent-green` | `#22c55e` |
| `--accent-purple` | `#a855f7` |

Each accent has a matching `--accent-*-fg` token. Blue uses white; yellow, orange, green, and purple use `--stage-border` so every nav label meets WCAG AA.

| State | Token | Value |
| --- | --- | --- |
| Correct/win | `--state-correct` | `#22c55e` |
| Incorrect/lose | `--state-incorrect` | `#ef4444` |
| Validation/duplicate | `--state-warning` | `#f59e0b` |
| Information | `--state-info` | `#3b82f6` |

State colors are overlays for borders, low-opacity backgrounds, and small icons—not primary surfaces or large text.

### Typography

- `--font-display`: Space Grotesk 700 or a similar geometric sans, used for display headings and nav labels.
- `--font-body`: Inter 400/500/600, used everywhere else.
- Display: `clamp(2rem, 4vw, 3rem)`; H2: `1.5rem`; H3: `1.125rem`; body: `1rem`; meta: `0.8125rem`.
- Space Grotesk and Inter load from Google Fonts in `src/app.html` with `display=swap` and system fallbacks.
- Thai falls back to Noto Sans Thai 400–700, listed after Space Grotesk and Inter in both stacks and loaded from the same Google Fonts request. Its Thai subset downloads only when Thai text is shown.

The main display heading ends with one bold italic word in `--glass-accent`. Use this signature treatment once per page.

### Components

| Surface | Contract |
| --- | --- |
| Nav card | Number and arrow above label; solid accent; inset border when active; on phones a single-line card with number and label side by side |
| Ticker | Short labels separated by `✦`; ~40s seamless scroll; static when motion is reduced |
| Glass panel | Cream surface, dark 1.5px border, 20px radius, 32px/20px responsive padding |
| Multiplayer switch | Segmented Local/Online control inside the play panel; active choice is dark-filled |
| Instructions | Orange card swaps the center panel between the game and the how-to-play content, including how to play with friends |
| Input | 56px high, white, centered text, 14px radius, visible blue focus ring; game-number fields filter to digits and enforce the configured length; the single-player guess field grows beside Submit Guess and wraps above it on narrow screens |
| Secondary button | 48px high, white, dark border, 14px radius |
| Icon button | 44px square `.btn-icon` secondary variant with a 20px glyph, an `aria-label`, and a matching `title` tooltip |
| Panel header | Display title with the Settings and GitHub icon group top-right; the group wraps above the title when the title needs the full width |
| GitHub stars | Icon-only GitHub mark beside Settings in the panel header; puts a validated live count in its accessible name and tooltip when available and remains a labeled link on API failure |
| Setup/control strip | Translucent white, dark border, and wrapping controls on narrow screens; labels stack above fields on phones; the local secret number is masked with a 44px eye toggle and re-masks for each player |
| Notepad | Single-player row of ten 44px digit buttons (5 × 2 on phones) cycling unmarked → ruled out (muted, struck through) → in the answer (correct tint and inset ring); a Clear notes action appears once a digit is marked, and every new game starts blank |
| Feedback banner | State-tinted low-opacity background and border; warning for validation, info for an unfinished guess, correct/incorrect only for the final result; clears when a new game starts |
| Result banner | Final win/lose message with a Play again action; takes focus when the game ends and returns focus to the guess field on replay |
| History row | Translucent white; newest row has a purple left border; single-player history lists newest first, shows an empty-state hint, and wraps the guess and score as whole phrases |
| Player card | Landscape nav-card language; inset turn border; red-tinted eliminated state and visible badge; newest guess first; a finished game offers Play again, which keeps player names |
| Online multiplayer | One cream-panel flow: name/create/join entry, room-ID lobby with paired Copy and Share actions, accessible confirmation tooltips, readiness, turn/guess state, reconnect status, and host restart; a two-step Leave game that forfeits, a warning banner offering to remove a player idle for two minutes, and players who left labelled Left |
| Settings modal | Active-mode title and fields with a note that changing them starts a new game, then a Language select whose options are written in their own language with a matching `lang`; cream surface, 480px maximum, blurred 40% black scrim, focus trap, and viewport-bounded scrolling |
| Hero | Decorative CSS/SVG tile tunnel with `aria-hidden="true"` |
| Utility row | Current mode plus visible `Enter` and `Escape` keyboard hints |

Icons are monochrome line icons, normally 18×18px with a 1.5px stroke. Icon-only buttons use 20×20px glyphs; the GitHub mark is the one filled brand icon.

### Motion

- Default: 180ms with `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Allow hover changes, ticker scroll, and short modal or feedback slide-ins.
- Do not use bounce, springs, parallax, page transitions, or non-ticker loops.
- Under `prefers-reduced-motion`, remove transitions and make the ticker static.

### Accessibility

- Meet WCAG AA: 4.5:1 for body text and 3:1 for large text.
- Every control needs an accessible name and a dual white/blue `:focus-visible` treatment that remains visible across surfaces.
- Never remove an outline without a replacement.
- Mark the hero and duplicated ticker content `aria-hidden`.
- Trap modal focus, restore it on close, and support `Escape`.
- Keep live regions mounted and change only their text; a region created together with its message is often not announced.
- When an action removes the focused control, move focus to the new content: the guess field, the result, or the new screen's heading.
- Enter submits only when no input method is composing, and a handled Enter calls `preventDefault` so it cannot also activate the control that receives focus.
- Keep the GitHub repository link accessible while its star count is loading or unavailable.

### Responsive behavior

| Width | Layout |
| --- | --- |
| `< 600px` | Hide hero; 2 × 2 compact nav; 20px panel padding; wrapping ticker |
| `600–899px` | Hide hero; one row of four compact nav cards; 24px panel padding |
| `≥ 900px` | Full three-column stage |

Use Tailwind breakpoints `sm: 600px`, `md: 900px`, and `lg: 1200px`. Document any additional breakpoint here first.

### File map

| Surface | File |
| --- | --- |
| Stage, ticker, nav, glass shell, hero, utilities | `src/routes/+page.svelte` |
| Single-player panel, result banner, and history | `src/lib/components/SinglePlayerGame.svelte` |
| Multiplayer panels and player cards | `src/lib/components/MultiPlayerGame.svelte` |
| Online entry, lobby, synchronized game, reconnect, and result states | `src/lib/components/OnlineMultiplayerGame.svelte` |
| Active-mode settings modal | `src/lib/components/SettingsModal.svelte` |
| GitHub repository link and live star count | `src/lib/components/GitHubStarLink.svelte` |
| Tokens, Tailwind `@theme` mappings, shared control classes, and global motion/focus styles | `src/app.css` |
| Display, body, and Thai font loading | `src/app.html` |
| English and Thai copy | `src/lib/i18n/messages.ts` |

Add new surfaces to this table. The initial editorial design system was recorded on 2026-07-08.

2026-07-27 — Added secure Firebase online rooms while retaining local multiplayer.

2026-07-28 — Implemented the editorial grid stage across all game, navigation, feedback, player, and settings surfaces.

2026-07-28 — Added shareable online-room links that select Online Multiplayer and pre-fill the room ID.

2026-07-28 — Moved settings into each game mode, added a best-effort live GitHub star link, and restricted game-number fields to digits.

2026-10-10 — Fit the tablet game above the fold with a one-row nav, kept the desktop New Game card shorter, compacted the GitHub link, and gave single player a Play again action, newest-first history, and feedback scoped to the current round.

2026-10-10 — Replaced the text Settings and GitHub buttons with a gear and GitHub icon pair in the panel header.

2026-10-10 — Localized the interface for English and Thai with an `EN`/`ไทย` switch in the panel header.

2026-10-10 — Moved the language choice into the Settings modal and kept Settings available during Instructions and inside online rooms.

2026-10-10 — Added the single-player notepad, masked local secrets, a multiplayer rematch, a 2 × 2 phone nav, and friend rules in Instructions; the Firebase SDK now loads only for online play.

## Change guide

| Change | Required work |
| --- | --- |
| Pure logic | Add/export it in `gameStore.ts`; add unit tests |
| Shared state | Extend `GameState`; add an intent-based action and state test |
| Component | Read the Design system; add `.svelte`, colocated test, and file-map row |
| Game mode | Extend types/state, add component/settings/nav, update design, add unit/component/e2e tests |
| Visual token | Add it to `src/app.css`, document it here, map it in Tailwind only if needed |
| Feedback rules | Update `calculateFeedback`, unit tests, affected components, and visible-flow tests |
| Copy | Add the entry to `en` and `th` in `src/lib/i18n/messages.ts`; cover new Thai copy in a component test |
| Bug | Reproduce with a failing test, fix the source, retain the regression test |

## Definition of done

- `pnpm check` passes with zero errors and warnings.
- `pnpm test:run` passes.
- `pnpm test:e2e` passes for affected flows, or the PR states why it was not run.
- README design/testing guidance is updated when affected.
- The diff contains no drive-by changes, `any`, `console.log`, hardcoded design values, secrets, or unapproved dependencies.
- User-visible UI changes include a screenshot in the PR.

## Deployment

`@sveltejs/adapter-static` builds to `build/`. GitHub Pages deploys the static client from `main` through `.github/workflows/deploy.yml`, which type-checks, runs the unit and end-to-end tests, and then builds; `static/CNAME` sets `number-guesser.pepo.dev`. `.github/workflows/deploy-firebase.yml` deploys Cloud Functions and Firestore rules/indexes to `asia-southeast1`.

Before the first backend deploy, create the Firestore database and enable Anonymous Auth. Configure these GitHub repository secrets:

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`

Add the Firebase service account JSON as the `FIREBASE_SERVICE_ACCOUNT` repository secret. Never put that service account in a public variable or committed file.

The service account needs permission for everything the backend deploy touches. Without it the deploy stops with `403 The caller does not have permission`, as every run before 2026-10-10 did at the Firestore rules step. In Google Cloud IAM, grant it Firebase Admin, Service Account User, and Cloud Scheduler Admin (for the hourly room cleanup), then re-run **Deploy Firebase Backend**. If a later step reports another 403, the error names the missing permission.

Until the backend is deployed, online commands show "Online play isn't available right now" instead of a generic retry message, and single player and local multiplayer are unaffected.

Firebase App Check is not enforced yet. Turning it on needs a reCAPTCHA Enterprise site key created in the Firebase console, App Check initialized in the client with that key, and `enforceAppCheck` on the callables. Until then, the per-user room limit and `maxInstances: 20` are the abuse guards.

Do not change the workflow, target, CNAME, or DNS without owner approval.

## Contributing

Create a focused branch, make the smallest tested change, run the required checks, and open a PR that explains why the change is needed.

Bug reports should include browser/version, reproduction steps, expected and actual behavior, and a screenshot when useful.

## License

MIT. See [`LICENSE`](LICENSE).

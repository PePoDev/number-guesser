# Design System

> **Source of truth for all visual and interaction design decisions in this project.**
> When in doubt, follow this document. If a decision is not covered here, propose an addition to this file in the same PR that introduces it.

---

## 1. Design Philosophy

The product is a small, focused puzzle game. The interface should feel like a **single, well-built object** — not a generic web page wrapped in a card. The visual language is inspired by editorial product design (think: a printed catalogue or a design studio's portfolio site) rather than typical SaaS dashboards.

Three principles guide every decision:

1. **One stage, one moment.** The whole game is presented as a single scene on a textured stage. There are no nested panels, no tab bars, no infinite scroll. The user's eye should land on the play area immediately.
2. **Color = meaning, never decoration.** Every color in the interface carries semantic weight (mode, state, player, action). Decorative color is avoided.
3. **Honest structure.** A visible grid, visible type hierarchy, and visible controls. Nothing is hidden behind hover-only affordances or clever transitions.

The vibe reference is editorial / portfolio work: bold sans-serif display type, a confident monochrome stage, numbered and labeled navigation, and a single hero visual.

---

## 2. Layout (The Stage)

The application is a full-viewport **stage** with three columns and two horizontal bands.

```
┌──────────────────────────────────────────────────────────────────────┐
│  TICKER  ── ✦ feature  ── ✦ feature  ── ✦ feature  ── ✦ feature  ──► │  ← top band
├────────┬────────────────────────────────────┬───────────────────────┤
│        │                                    │                       │
│  01    │                                    │                       │
│  ▮▮▮   │        ┌──────────────────┐        │                       │
│  nav   │        │                  │        │     HERO VISUAL       │
│  item  │        │   GLASS PANEL    │        │     (3D / tunnel /    │
│        │        │   (game area)    │        │      number grid)     │
│  02    │        │                  │        │                       │
│  ▮▮▮   │        └──────────────────┘        │                       │
│  nav   │                                    │                       │
│  item  │                                    │                       │
│        │                                    │                       │
│  03    │                                    │                       │
│  04    │                                    │                       │
│        │                                    │                       │
│  [CTA] │                                    │                       │
├────────┴────────────────────────────────────┴───────────────────────┤
│  🌐 English   ⓘ GitHub   ⓕ 𝕏   ⓣ LinkedIn                          │  ← bottom band
└──────────────────────────────────────────────────────────────────────┘
```

### 2.1 Grid Background (the stage floor)

- A **blue grid** covers the entire viewport behind the content. It is the dominant background and gives the product a distinct identity.
- Grid line color: a low-contrast blue, sitting on top of a slightly darker blue field.
- Grid line weight: 1px.
- Grid cell size: roughly 32×32px on desktop, 24×24px on mobile.
- The grid is **not** a CSS background image tile; it is rendered as a single `background-image` using two `linear-gradient` layers (vertical + horizontal lines) so it scales cleanly on retina and high-DPI screens.

### 2.2 Outer Container

- A single rounded container holds the three columns. The container has the grid as its background and a thick black border (about 1.5–2px) to read as a printed object.
- Outer corner radius: ~24px on desktop, ~16px on mobile.
- Outer padding: ~24px on desktop, ~12px on mobile.

### 2.3 Columns

| Column | Width (desktop) | Content |
| --- | --- | --- |
| Left rail (nav) | ~140px fixed | Numbered nav cards, stacked vertically |
| Center (play) | flex 1, min 320px | Glass panel containing the game |
| Right (hero) | ~40% of remaining space | Hero visual |

On screens narrower than 900px the columns collapse to a single column: nav on top, hero visual below the play panel. On screens narrower than 600px the hero visual is hidden.

### 2.4 Top Ticker

- A horizontal band along the top of the stage.
- Content: a list of short feature labels (3–6 words each) separated by a `✦` glyph.
- The list **scrolls** slowly left-to-right. On reduced-motion devices it is static and wraps to a second line.
- Height: ~48px.
- Ticker sits on a slightly darker blue than the grid, with the same border treatment as the outer container.

### 2.5 Bottom Utility Row

- Bottom-left of the stage, below the nav rail.
- Contains (in order): language switcher, then a row of social / external-link icons.
- Height: ~64px.

---

## 3. Color Tokens

Colors are defined as CSS custom properties on `:root` in `src/app.css` and exposed as Tailwind tokens where appropriate. **Do not introduce raw hex values in components.**

### 3.1 Stage Colors

| Token | Value (suggested) | Use |
| --- | --- | --- |
| `--stage-bg` | `#1d4ed8` (blue-700-ish) | Grid field base |
| `--stage-grid` | `rgba(255,255,255,0.18)` | Grid lines |
| `--stage-border` | `#0b1220` | Outer container + card borders |
| `--ticker-bg` | `#1e40af` | Ticker band, slightly darker than stage |
| `--ticker-fg` | `#fef3c7` (warm cream) | Ticker text |

### 3.2 Accent / Mode Colors (the "nav cards")

These are the saturated blocks used in the left rail. They map directly to game modes and meaningful sections.

| Token | Value | Maps to |
| --- | --- | --- |
| `--accent-blue` | `#2563eb` | `01` Single player |
| `--accent-yellow` | `#facc15` | `02` Multiplayer |
| `--accent-orange` | `#f97316` | `03` How to play |
| `--accent-green` | `#22c55e` | `04` Settings |
| `--accent-purple` | `#a855f7` | Primary CTA ("New Game" / "Play") |

Each accent token has a paired `--accent-{name}-fg` for text placed on it:

| Token | Value | Use |
| --- | --- | --- |
| `--accent-blue-fg` | `#ffffff` | Text on blue |
| `--accent-yellow-fg` | `#0b1220` | Text on yellow (dark) |
| `--accent-orange-fg` | `#0b1220` | Text on orange (dark) |
| `--accent-green-fg` | `#0b1220` | Text on green (dark) |
| `--accent-purple-fg` | `#ffffff` | Text on purple |

### 3.3 Glass Panel (the play area)

| Token | Value | Use |
| --- | --- | --- |
| `--glass-bg` | `#f5efe6` (warm cream) | Glass panel base |
| `--glass-border` | `#0b1220` | Glass panel border |
| `--glass-fg` | `#0b1220` | Body text inside the glass panel |
| `--glass-muted` | `#5b6478` | Secondary / meta text |
| `--glass-accent` | `#facc15` | Highlighted value text (e.g. the digit count, attempts left) |

### 3.4 Semantic / State Colors

| Token | Value | Use |
| --- | --- | --- |
| `--state-correct` | `#22c55e` (green-500) | Correct guess, win state |
| `--state-incorrect` | `#ef4444` (red-500) | Wrong guess, lose state |
| `--state-warning` | `#f59e0b` (amber-500) | Validation error, duplicate guess |
| `--state-info` | `#3b82f6` (blue-500) | Neutral info banner |

State colors are used for **borders, backgrounds at low opacity, and small icons only** — never for large type. They sit on the cream glass background, so they always read as overlays, not as primary surfaces.

---

## 4. Typography

Two type families. Both loaded via `@font-face` with `font-display: swap`. No third font is introduced without updating this section.

### 4.1 Display Family — `--font-display`

- Used for: hero headings inside the glass panel (e.g. "Number guessing, redefined."), the brand mark "units." logo if present, nav card labels.
- Suggested family: a bold geometric sans with a slight humanist warmth, e.g. **Space Grotesk** (700) or **Söhne** (if licensed).
- Weight: 700 only.
- Tracking: tight, `-0.02em` at large sizes, `-0.01em` at body sizes.
- Case: sentence case by default, except for the brand mark which uses a trailing period as a graphic device.

### 4.2 Body Family — `--font-body`

- Used for: everything else (body copy, labels, inputs, buttons, history rows).
- Suggested family: **Inter** (400, 500, 600).
- Body size: 16px base, 1.5 line-height.
- Small / meta: 13–14px.

### 4.3 Type Scale

| Token | Size | Use |
| --- | --- | --- |
| `--text-display` | clamp(2rem, 4vw, 3rem) | Hero heading in glass panel |
| `--text-h2` | 1.5rem | Section headings inside panel |
| `--text-h3` | 1.125rem | Sub-section headings |
| `--text-body` | 1rem | Body copy, input text |
| `--text-meta` | 0.8125rem | Labels, history meta, ticker text |

### 4.4 The "italic accent" trick

The display heading in the glass panel ends with an italicized word (e.g. *"redefined."*). The italic word uses the same display family at 700 italic, in `--glass-accent` (yellow). This is the project's signature typographic move — use it on the one most important headline on the page, no more.

---

## 5. Components

Each component below is a real surface in the app. The implementation lives in `src/lib/components/`. The design contract for each is documented here.

### 5.1 Nav Card (left rail item)

- A vertically-tall colored card (~140px wide × 140px tall on desktop).
- Contents: a small index number (`01`, `02`, ...) top-left in the card's foreground color, an arrow glyph (`↗`) top-right, and a label at the bottom-left in the same foreground color.
- States:
  - **Default** — solid accent background, accent foreground.
  - **Hover** — scale to `1.02`, increase shadow.
  - **Active / current** — a 2px black inset border, no scale.
  - **Disabled** — 50% opacity, no hover.
- All four cards in the rail use the four accent colors in order. The CTA card (purple) is the bottom-most and is half-height.

### 5.2 Ticker

- A single horizontal row of label/glyph pairs.
- Each label: sentence case, no punctuation, 2–5 words.
- Separator glyph: `✦` (or `+` as a fallback), in `--ticker-fg` at 60% opacity.
- Animation: `transform: translateX(0)` → `translateX(-50%)` over ~40s linear, infinite. The labels are duplicated in the DOM so the loop is seamless.
- `prefers-reduced-motion: reduce` → animation disabled, content wraps.

### 5.3 Glass Panel (play area)

- The cream rounded panel that holds the game.
- Border: 1.5px solid `--glass-border`, radius 20px.
- Inner padding: 32px on desktop, 20px on mobile.
- Contains, in order: a small pill-shaped section label ("Single Player" / "Multiplayer"), the display heading, the body description, a two-column feature list, and the primary CTA.

#### 5.3.1 Section Pill

- Small rounded-full chip, 1px border, transparent background.
- Text: section name in `--text-meta`, weight 500.

#### 5.3.2 Feature List

- Two columns on desktop, one on mobile.
- Each row: a small monochrome icon (line, 1.5px stroke), a 12px gap, a label.
- Icons are 18×18px, color `--glass-fg` at 80% opacity.

#### 5.3.3 Primary CTA (inside the panel)

- Full-width or auto-width button, depending on context.
- Background: `--stage-border` (near-black).
- Foreground: white.
- Radius: 999px (pill).
- Padding: 14px 24px.
- Contents: label + trailing arrow (`↗`).
- Hover: 4% lift (`translateY(-1px)`), shadow intensifies.

### 5.4 Hero Visual (right column)

- A single 1:1 (or 4:5) graphic occupying the right column.
- Renders an **infinite tunnel of numbered tiles** in perspective — small colored squares arranged in a 3D grid receding to a vanishing point at the center. Some tiles display a digit (0–9) in place of a color, hinting at the game's theme.
- The visual is decorative, not interactive. `aria-hidden="true"`.
- Implementation: a single canvas or a layered SVG/HTML grid with CSS `transform: perspective(...)`. **CSS only — no animation libraries.**
- Mobile: hidden below 600px viewport width.

### 5.5 Input

- Used for: guess entry, player name, secret number.
- 56px tall, full-width inside its container, max-width 320px.
- Background: white, 1.5px border `--glass-border`, radius 14px.
- Text: centered, 1.25rem, `--glass-fg`.
- Focus: 3px outer ring in `--accent-blue` at 30% opacity, no border color change.

### 5.6 Button (secondary)

- Used for: "Submit Guess", "Save & Continue", modal "Close".
- 48px tall, auto-width.
- Background: white, 1.5px border `--glass-border`, radius 14px.
- Text: `--glass-fg`, weight 600.
- Hover: 2% scale, shadow lifts.

### 5.7 Feedback Banner

- A horizontal banner that appears above the history list.
- Padding: 12px 16px, radius 14px, 1.5px border.
- Background: state color at 12% opacity, border at 60% opacity, foreground `--glass-fg`.
- One icon (matching the state) on the left, one line of text, optional close button on the right.

### 5.8 Guess History Row

- One row per guess.
- Layout: left-aligned "Guess N: 042", right-aligned meta string.
- Background: white at 60% opacity, 1.5px border, radius 10px.
- The most recent row gets a 2px left border in `--accent-purple`.

### 5.9 Player Card (multiplayer)

- One card per player in the setup and guessing phases.
- Mirrors the **Nav Card** visual language (colored background, index number, name), but in landscape orientation: number top-left, name large in the center, status badge bottom-right.
- "Eliminated" state: red-tinted version of the card with a 50% opacity overlay and a strikethrough on the name.
- "Current turn" state: a 3px black inset border, no scale.

### 5.10 Settings Modal

- Centered, max-width 480px, on a backdrop scrim at 40% black with a 8px backdrop blur.
- Same cream glass surface as the main panel.
- Header: 2px bottom border, section title + close button.
- Body: stacked rows of `label` + `select` (or `input`).
- Footer: a single secondary button ("Close").

### 5.11 Bottom Utility Row

- Bottom-left of the stage.
- Layout: language switcher chip (left), then a row of three circular icon buttons (right). Each icon button is 40×40, 1.5px border, transparent background, hover fills with white at 10%.

---

## 6. Iconography

- Icons are **line icons only**, 1.5px stroke, 18×18px by default.
- Icon set: **Lucide** (open source, MIT). No icon font, no sprite — import the specific components used.
- Icons sit in a square 18×18 box; the parent row centers the icon and aligns the label baseline to the icon's vertical center.
- Color follows context: `--glass-fg` inside the panel, `--stage-border` on the cream, foreground accent on the colored cards.

---

## 7. Motion

Motion is restrained. The product is a small game; it should feel responsive, not theatrical.

- **Default duration:** 180ms.
- **Default easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (snappy out, soft in).
- **Allowed:**
  - Hover state changes on interactive elements.
  - Ticker scroll (looping).
  - Modal slide-in on open (translateY -8px → 0, opacity 0 → 1, 200ms).
  - Feedback banner slide-in (same as modal).
  - Subtle 1–2% scale on nav-card hover.
- **Not allowed:**
  - Bounce, spring, or elastic easings.
  - Looping animations on any non-ticker element.
  - Page transitions.
  - Parallax.
- **Reduced motion:** all transitions drop to 0ms; the ticker becomes a static, wrapping row.

---

## 8. Accessibility

- Color contrast for all text on its background meets **WCAG AA** (4.5:1 for body, 3:1 for large text). The cream `--glass-bg` with dark `--glass-fg` is well above AA; the colored nav cards are checked per pair.
- Focus rings are always visible. The default browser outline is replaced with a 3px ring in `--accent-blue` at 30% opacity; never `outline: none` without a replacement.
- All interactive elements have a visible `:focus-visible` state and an accessible name (`aria-label` or visible text).
- The hero visual is `aria-hidden="true"` — it conveys no information.
- The ticker is `aria-hidden="true"` and its content is duplicated as a visually hidden static list for screen readers if the ticker content is considered informational.
- The modal traps focus while open and restores focus on close. `Escape` closes it.

---

## 9. Responsive Breakpoints

| Name | Width | Notes |
| --- | --- | --- |
| `mobile` | < 600px | Hero visual hidden. Nav rail collapses to a horizontal row at the top of the stage. Glass panel padding 20px. Ticker wraps to 2 lines. |
| `tablet` | 600–900px | Hero visual still hidden. Glass panel padding 24px. Nav rail becomes a 2×2 grid. |
| `desktop` | ≥ 900px | Full 3-column layout as in §2. |

Tailwind breakpoints: `sm` 600, `md` 900, `lg` 1200. Do not introduce a fourth breakpoint without updating this section.

---

## 10. File-to-Design Map

Where each surface from this document is implemented in the codebase:

| Surface | File |
| --- | --- |
| Stage, ticker, nav rail, glass panel, hero visual, bottom utility row | `src/routes/+page.svelte` |
| Glass-panel internals (heading, body, features, CTA) | `src/lib/components/SinglePlayerGame.svelte` |
| Multiplayer-specific panels (player cards, target picker) | `src/lib/components/MultiPlayerGame.svelte` |
| Settings modal | `src/lib/components/SettingsModal.svelte` |
| Global tokens, glass utility, scrollbar, motion baseline | `src/app.css` |
| Tailwind config (only the theme extension that maps design tokens to utilities) | `tailwind.config.js` |

If you add a new surface, add a row here in the same PR.

---

## 11. Decision Log

Append-only record of design decisions, newest first. One line per decision: date, what changed, why.

- **2026-07-08** — Initial design system documented. Visual language: editorial / portfolio (blue grid stage, numbered colored nav cards, cream glass panel, signature italic accent on the display heading). Mapped to the existing single-player and multiplayer game surfaces.

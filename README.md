# Number Guessing Game 🎯

A modern, interactive number guessing game built with **SvelteKit** and **Tailwind CSS**. Features both single-player and multiplayer modes with customizable difficulty settings and a stunning **glassmorphism design**.

🎮 **[Play Live Demo](https://number-guesser.pepo.dev)**

## 📋 Table of Contents

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

## 🎯 Overview

This Number Guessing Game is a web-based puzzle game where players attempt to guess a secret number within a limited number of attempts. The game provides feedback on each guess, indicating how many digits are correct and how many are in the correct position.

### Key Highlights

- **Dual Game Modes**: Single-player vs computer and multiplayer competitive mode
- **Customizable Difficulty**: 2-5 digit numbers with adjustable attempt limits
- **Real-time Feedback**: Instant feedback on digit accuracy and positioning
- **Glassmorphism Design**: Modern frosted glass UI with beautiful gradient backgrounds
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS styling
- **Built with SvelteKit**: Fast, reactive, and optimized

## ✨ Features

### Core Features

- 🎮 **Single Player Mode**: Play against the computer
- 👥 **Multiplayer Mode**: Competitive gameplay for 2-4 players
- ⚙️ **Customizable Settings**: Adjust digit count (2-5) and attempt limits (3-20)
- 📊 **Guess History**: Track all previous guesses and their feedback
- 🎨 **Glassmorphism Design**: Stunning frosted glass effects with backdrop blur
- 🌈 **Beautiful Gradients**: Vibrant blue-to-teal radial gradient background
- ⌨️ **Keyboard Support**: Enter key support for quick gameplay
- 🚀 **Fast Performance**: Built with SvelteKit for optimal speed
- 🔄 **Smooth Animations**: Hover effects and transitions throughout

### Design Features

- **Frosted Glass Effects**: Semi-transparent containers with backdrop blur
- **Gradient Backgrounds**: Beautiful radial gradient from blue to teal
- **Custom Scrollbars**: Styled scrollbars matching the glass aesthetic
- **Hover Animations**: Interactive elements with scale and shadow effects
- **Text Shadows**: Enhanced readability on transparent backgrounds
- **Responsive Layout**: Adapts beautifully to all screen sizes

### Game Mechanics

- **Feedback System**:
  - **Correct Digits**: Count of digits present in the target number
  - **Correct Positions**: Count of digits in the exact right position
- **Input Validation**: Ensures valid number format and length
- **Duplicate Detection**: Prevents guessing the same number twice
- **Auto-padding**: Automatically adds leading zeros for shorter inputs
- **State Management**: Svelte stores for reactive game state

## 🎮 Game Modes

### Single Player Mode

- Play against a computer-generated random number
- Customizable attempt limits (3-20 attempts)
- Immediate feedback on each guess
- Win/lose conditions with celebratory messages
- Visual feedback with glassmorphism effects

### Multiplayer Mode

- **Setup Phase**: Each player enters their name and secret number
- **Guessing Phase**: Players take turns guessing each other's numbers
- **Elimination System**: Players are eliminated when their number is guessed
- **Winner Determination**: Last remaining player wins
- **Visual Indicators**: Active player highlighting and elimination status
- **Player Cards**: Beautiful glass-effect cards for each player

## 🎯 How to Play

### Basic Rules

1. **Choose Settings**: Select number of digits (2-5) and game mode
2. **Make Guesses**: Enter your guess for the secret number
3. **Interpret Feedback**:
   - **Correct Digits**: How many of your digits appear in the target number
   - **Correct Positions**: How many digits are in the exact right position
4. **Win Condition**: Guess the exact number within the attempt limit

### Example

- **Target Number**: `401`
- **Your Guess**: `410`
- **Feedback**: `3 correct digits, 1 correct position`
- **Explanation**: All digits (4,1,0) are in the target, but only `4` is in the correct position

## 🔧 Technical Specifications

### Technology Stack

- **Framework**: SvelteKit 2.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.x
- **Design Pattern**: Glassmorphism with custom CSS
- **State Management**: Svelte Stores with Runes ($state, $effect)
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Testing**: Vitest, Testing Library, Playwright
- **Deployment**: Static adapter for GitHub Pages

### Design Implementation

- **Glassmorphism Effects**:
  - `backdrop-filter: blur()` for frosted glass
  - Semi-transparent backgrounds (rgba with 10-30% opacity)
  - Subtle borders with white/30% opacity
  - Custom utility classes for reusable glass effects
- **Gradient Background**: Radial gradient from `rgba(83,113,245,1)` to `rgba(107,228,184,1)`
- **Custom Scrollbars**: Styled to match the glass aesthetic
- **Smooth Transitions**: CSS transitions on all interactive elements

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: Glassmorphism effects require modern browsers with backdrop-filter support.

### Performance Features

- **Server-Side Rendering**: Optional SSR support
- **Static Site Generation**: Pre-rendered for optimal performance
- **Fast Loading**: Optimized bundle size
- **Responsive**: Tailwind CSS for all screen sizes
- **Accessible**: Keyboard navigation support
- **Hardware Acceleration**: CSS transforms for smooth animations

## 📁 Project Structure

```
number-guessing/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── SettingsModal.svelte
│   │   │   ├── SinglePlayerGame.svelte
│   │   │   └── MultiPlayerGame.svelte
│   │   └── stores/
│   │       └── gameStore.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.js
│   │   └── +page.svelte
│   ├── app.css
│   ├── app.d.ts
│   └── app.html
├── static/
│   ├── CNAME
│   └── robots.txt
├── svelte.config.js
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Key Files

#### [`src/lib/stores/gameStore.ts`](src/lib/stores/gameStore.ts)

- Centralized game state management using Svelte stores
- Game logic functions (validation, feedback calculation)
- Type definitions for game state

#### [`src/routes/+page.svelte`](src/routes/+page.svelte)

- Main game page component with glassmorphism design
- Handles game mode switching
- Integrates all sub-components
- Gradient background implementation

#### [`src/lib/components/`](src/lib/components/)

- **SettingsModal.svelte**: Game configuration modal with glass effects
- **SinglePlayerGame.svelte**: Single-player game interface with glassmorphism
- **MultiPlayerGame.svelte**: Multiplayer game interface with glass player cards

#### [`src/app.css`](src/app.css)

- Global styles and Tailwind CSS imports
- Custom glassmorphism utility classes
- Scrollbar styling
- Smooth transition definitions

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm

### Quick Start

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/number-guessing.git
   cd number-guessing
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Start development server**:

   ```bash
   pnpm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173`

### Build for Production

```bash
pnpm run build
```

The built files will be in the `build/` directory.

### Preview Production Build

```bash
pnpm run preview
```

## 🛠️ Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run check` - Run TypeScript and Svelte checks
- `pnpm run check:watch` - Run checks in watch mode
- `pnpm test` - Run unit and component tests
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm test:all` - Run all tests

### Code Organization

- **Component-Based**: Modular Svelte components
- **Type-Safe**: TypeScript for type safety
- **Reactive**: Svelte stores with modern Runes API
- **Styled**: Tailwind CSS utility classes + custom glassmorphism CSS
- **Tested**: Comprehensive test coverage

### Adding New Features

1. **New Game Mode**: Extend the game store and add corresponding components
2. **Difficulty Levels**: Modify settings in the store
3. **Themes**: Extend Tailwind configuration or modify gradient backgrounds
4. **Sound Effects**: Add audio elements and integrate with game events
5. **Animations**: Extend CSS transitions or add new glass effects

### Customizing the Design

To customize the glassmorphism design:

1. **Background Gradient**: Modify the `background-image` in [`src/routes/+page.svelte`](src/routes/+page.svelte:30)
2. **Glass Opacity**: Adjust `bg-white/XX` values in components
3. **Blur Amount**: Change `backdrop-blur-XX` values
4. **Border Opacity**: Modify `border-white/XX` values
5. **Custom Classes**: Add new utility classes in [`src/app.css`](src/app.css)

## 🧪 Testing

This project has comprehensive test coverage including unit tests, component tests, and end-to-end tests.

### Running Tests

```bash
# Run unit and component tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test:all
```

### Test Coverage

The project includes:

- **Unit Tests** - Core game logic and helper functions
- **Component Tests** - All Svelte components with user interaction testing
- **E2E Tests** - Complete user workflows for both game modes

For detailed testing documentation, see [TESTING.md](TESTING.md).

### Test Structure

```
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── *.test.ts          # Component tests
│   │   └── stores/
│   │       └── *.test.ts          # Unit tests
│   └── tests/
│       └── setup.ts               # Test configuration
├── e2e/
│   ├── single-player.spec.ts      # E2E tests
│   └── multiplayer.spec.ts        # E2E tests
├── vitest.config.ts               # Vitest config
└── playwright.config.ts           # Playwright config
```

## 🌐 Deployment

### GitHub Pages (Current Deployment)

The game is deployed at `number-guesser.pepo.dev` using GitHub Pages.

**Setup Steps**:

1. Build the project:

   ```bash
   pnpm run build
   ```

2. The `static/CNAME` file contains the custom domain

3. Configure GitHub Pages to serve from the `build` directory

4. Configure DNS to point to GitHub Pages

### Alternative Deployment Options

- **Netlify**: Connect GitHub repository for automatic deployments
- **Vercel**: Import project and deploy with zero configuration
- **Cloudflare Pages**: Connect repository and deploy
- **Any Static Host**: Upload the `build/` directory

### Adapter Configuration

The project uses `@sveltejs/adapter-static` for static site generation. Configuration is in [`svelte.config.js`](svelte.config.js).

## 🤝 Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/new-feature`
3. **Make your changes** with clear, descriptive commits
4. **Test thoroughly** across different browsers and devices
5. **Submit a pull request** with a detailed description

### Contribution Ideas

- 🎨 **UI Improvements**: Enhanced animations or visual effects
- 🎮 **Game Features**: New game modes or scoring systems
- 🔧 **Technical Enhancements**: Performance optimizations
- 📱 **Mobile Experience**: Touch gestures or mobile-specific features
- 🌐 **Accessibility**: Screen reader support improvements
- 🎭 **Design Themes**: Alternative color schemes or design patterns
- 🔊 **Sound Effects**: Audio feedback for game events

### Bug Reports

Please include:

- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ using SvelteKit, Tailwind CSS, and Glassmorphism Design**

_For questions, suggestions, or contributions, please open an issue or submit a pull request._

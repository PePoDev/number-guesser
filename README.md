# Number Guessing Game 🎯

A modern, interactive number guessing game built with **SvelteKit** and **Tailwind CSS**. Features both single-player and multiplayer modes with customizable difficulty settings.

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
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS styling
- **Built with SvelteKit**: Fast, reactive, and optimized

## ✨ Features

### Core Features

- 🎮 **Single Player Mode**: Play against the computer
- 👥 **Multiplayer Mode**: Competitive gameplay for 2-4 players
- ⚙️ **Customizable Settings**: Adjust digit count (2-5) and attempt limits (3-20)
- 📊 **Guess History**: Track all previous guesses and their feedback
- 🎨 **Modern UI**: Responsive design with Tailwind CSS
- ⌨️ **Keyboard Support**: Enter key support for quick gameplay
- 🚀 **Fast Performance**: Built with SvelteKit for optimal speed

### Game Mechanics

- **Feedback System**:
  - **Correct Digits**: Count of digits present in the target number
  - **Correct Positions**: Count of digits in the exact right position
- **Input Validation**: Ensures valid number format and length
- **Auto-padding**: Automatically adds leading zeros for shorter inputs
- **State Management**: Svelte stores for reactive game state

## 🎮 Game Modes

### Single Player Mode

- Play against a computer-generated random number
- Customizable attempt limits (3-20 attempts)
- Immediate feedback on each guess
- Win/lose conditions with celebratory messages

### Multiplayer Mode

- **Setup Phase**: Each player enters their name and secret number
- **Guessing Phase**: Players take turns guessing each other's numbers
- **Elimination System**: Players are eliminated when their number is guessed
- **Winner Determination**: Last remaining player wins
- **Visual Indicators**: Active player highlighting and elimination status

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
- **State Management**: Svelte Stores
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Testing**: Vitest, Testing Library, Playwright
- **Deployment**: Static adapter for GitHub Pages

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Features

- **Server-Side Rendering**: Optional SSR support
- **Static Site Generation**: Pre-rendered for optimal performance
- **Fast Loading**: Optimized bundle size
- **Responsive**: Tailwind CSS for all screen sizes
- **Accessible**: Keyboard navigation support

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

- Main game page component
- Handles game mode switching
- Integrates all sub-components

#### [`src/lib/components/`](src/lib/components/)

- **SettingsModal.svelte**: Game configuration modal
- **SinglePlayerGame.svelte**: Single-player game interface
- **MultiPlayerGame.svelte**: Multiplayer game interface

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
- **Reactive**: Svelte stores for state management
- **Styled**: Tailwind CSS utility classes

### Adding New Features

1. **New Game Mode**: Extend the game store and add corresponding components
2. **Difficulty Levels**: Modify settings in the store
3. **Themes**: Extend Tailwind configuration
4. **Sound Effects**: Add audio elements and integrate with game events

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

### Bug Reports

Please include:

- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ using SvelteKit and Tailwind CSS**

_For questions, suggestions, or contributions, please open an issue or submit a pull request._

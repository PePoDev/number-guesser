# Testing Documentation

This document provides comprehensive information about the testing setup and strategies for the Number Guessing Game project.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Component Tests](#component-tests)
- [End-to-End Tests](#end-to-end-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)

## Overview

The project uses a comprehensive testing strategy with three layers:

1. **Unit Tests** - Test individual functions and logic
2. **Component Tests** - Test Svelte components in isolation
3. **End-to-End Tests** - Test complete user workflows

## Testing Stack

### Unit & Component Testing

- **Vitest** - Fast unit test framework
- **@testing-library/svelte** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for Node.js

### End-to-End Testing

- **Playwright** - Browser automation and E2E testing
- **Chromium** - Browser engine for tests

## Test Structure

```
number-guessing/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── SinglePlayerGame.svelte
│   │   │   ├── SinglePlayerGame.test.ts      # Component tests
│   │   │   ├── MultiPlayerGame.svelte
│   │   │   ├── MultiPlayerGame.test.ts       # Component tests
│   │   │   ├── SettingsModal.svelte
│   │   │   └── SettingsModal.test.ts         # Component tests
│   │   └── stores/
│   │       ├── gameStore.ts
│   │       └── gameStore.test.ts             # Unit tests
│   └── tests/
│       └── setup.ts                          # Test setup
├── e2e/
│   ├── single-player.spec.ts                 # E2E tests
│   └── multiplayer.spec.ts                   # E2E tests
├── vitest.config.ts                          # Vitest configuration
└── playwright.config.ts                      # Playwright configuration
```

## Running Tests

### Unit & Component Tests

```bash
# Run tests in watch mode (recommended for development)
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once (for CI)
pnpm test:run

# Run tests with coverage report
pnpm test:coverage
```

### End-to-End Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI (interactive mode)
pnpm test:e2e:ui

# Run E2E tests in debug mode
pnpm test:e2e:debug
```

### Run All Tests

```bash
# Run both unit/component and E2E tests
pnpm test:all
```

## Unit Tests

### Game Store Tests (`src/lib/stores/gameStore.test.ts`)

Tests for the core game logic and state management:

- **Initial State** - Verifies default game configuration
- **Mode Management** - Tests switching between single/multiplayer modes
- **Settings Management** - Tests updating game settings
- **Single Player Logic** - Tests guess tracking, attempts, game over conditions
- **Multiplayer Logic** - Tests player setup, turn rotation, elimination, winner determination

### Helper Function Tests

- **`validateGuess()`** - Tests input validation for different scenarios
- **`calculateFeedback()`** - Tests feedback calculation for various guess/target combinations

**Example Test:**

```typescript
it("should calculate perfect match", () => {
  const result = calculateFeedback("123", "123");
  expect(result.correctDigits).toBe(3);
  expect(result.correctPositions).toBe(3);
});
```

## Component Tests

### SinglePlayerGame Tests (`src/lib/components/SinglePlayerGame.test.ts`)

Tests for the single-player game interface:

- Input rendering and interaction
- Guess submission (button and Enter key)
- Feedback display
- Guess history tracking
- Input validation
- Game over states
- Input clearing after guess

**Example Test:**

```typescript
it("should submit guess on Enter key press", async () => {
  const user = userEvent.setup();
  render(SinglePlayerGame);

  const input = screen.getByPlaceholderText("Enter number");
  await user.type(input, "123{Enter}");

  await waitFor(() => {
    expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
  });
});
```

### MultiPlayerGame Tests (`src/lib/components/MultiPlayerGame.test.ts`)

Tests for the multiplayer game interface:

- **Setup Phase** - Player name/number input, turn progression
- **Guessing Phase** - Turn rotation, target selection, guess recording
- **Finished Phase** - Winner display
- **Three/Four Player Games** - Multi-player scenarios

### SettingsModal Tests (`src/lib/components/SettingsModal.test.ts`)

Tests for the settings modal:

- Modal rendering and closing
- Game mode selection
- Digit count configuration
- Max attempts configuration (single player)
- Player count configuration (multiplayer)
- Settings persistence
- Accessibility features

## End-to-End Tests

### Single Player E2E Tests (`e2e/single-player.spec.ts`)

Complete user workflows for single-player mode:

- Game initialization and UI display
- Making guesses and receiving feedback
- Guess history tracking
- Input validation
- Game over scenarios (win/lose)
- Settings changes
- New game functionality
- Different configurations (2-5 digits, various attempt limits)

**Example Test:**

```typescript
test("should submit guess and show feedback", async ({ page }) => {
  const input = page.locator('input[placeholder="Enter number"]');
  await input.fill("123");
  await page.click('button:has-text("Submit Guess")');

  await expect(page.locator("text=/Correct digits:/")).toBeVisible();
  await expect(page.locator("text=/Correct positions:/")).toBeVisible();
});
```

### Multiplayer E2E Tests (`e2e/multiplayer.spec.ts`)

Complete user workflows for multiplayer mode:

- Player setup phase
- Guessing phase with turn rotation
- Player elimination
- Winner determination
- Three and four player games
- New game restart

## Test Coverage

To generate a coverage report:

```bash
pnpm test:coverage
```

This generates:

- Terminal output with coverage summary
- HTML report in `coverage/` directory
- JSON report for CI integration

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup code
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Component Test Template

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Component from "./Component.svelte";

describe("Component Name", () => {
  it("should render correctly", () => {
    render(Component);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Setup steps
  });

  test("should complete user workflow", async ({ page }) => {
    // Interact with page
    await page.fill('input[placeholder="..."]', "value");
    await page.click('button:has-text("Submit")');

    // Assert results
    await expect(page.locator("text=Success")).toBeVisible();
  });
});
```

## Best Practices

### General

1. **Test Behavior, Not Implementation** - Focus on what the user sees and does
2. **Use Descriptive Test Names** - Test names should clearly describe what is being tested
3. **Arrange-Act-Assert Pattern** - Structure tests clearly
4. **One Assertion Per Test** - Keep tests focused (when practical)
5. **Avoid Test Interdependence** - Each test should be independent

### Unit Tests

1. **Test Edge Cases** - Include boundary conditions and error cases
2. **Mock External Dependencies** - Isolate the unit being tested
3. **Keep Tests Fast** - Unit tests should run in milliseconds

### Component Tests

1. **Test User Interactions** - Click, type, keyboard events
2. **Test Accessibility** - Use semantic queries (getByRole, getByLabelText)
3. **Wait for Async Updates** - Use waitFor for state changes
4. **Clean Up After Tests** - Use cleanup() in afterEach

### E2E Tests

1. **Test Critical User Paths** - Focus on important workflows
2. **Use Page Object Pattern** - For complex pages (optional)
3. **Handle Timing Issues** - Use Playwright's auto-waiting
4. **Take Screenshots on Failure** - Already configured
5. **Keep Tests Stable** - Avoid flaky tests

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:run

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
```

## Debugging Tests

### Unit/Component Tests

```bash
# Run specific test file
pnpm vitest src/lib/stores/gameStore.test.ts

# Run tests matching pattern
pnpm vitest -t "should validate"

# Run with UI for debugging
pnpm test:ui
```

### E2E Tests

```bash
# Run specific test file
pnpm test:e2e e2e/single-player.spec.ts

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Run in debug mode (step through)
pnpm test:e2e:debug

# Run specific test
pnpm exec playwright test -g "should submit guess"
```

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot find module"

- **Solution**: Run `pnpm install` to ensure all dependencies are installed

**Issue**: E2E tests timeout

- **Solution**: Increase timeout in `playwright.config.ts` or ensure dev server is running

**Issue**: Component tests fail with "not wrapped in act()"

- **Solution**: Use `waitFor()` for async state updates

**Issue**: Flaky E2E tests

- **Solution**: Use Playwright's built-in waiting mechanisms, avoid arbitrary timeouts

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before submitting PR
3. Maintain or improve test coverage
4. Update this documentation if adding new test patterns

---

**Last Updated**: 2025-01-20

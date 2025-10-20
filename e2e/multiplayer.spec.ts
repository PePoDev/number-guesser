import { test, expect } from "@playwright/test";

test.describe("Multiplayer Game", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Switch to multiplayer mode
    await page.click('button[title="Game Settings"]');
    await page.waitForSelector("text=Game Settings", { state: "visible" });
    await page.selectOption("select#game-mode", "multi");
    await page.selectOption("select#player-count", "2");
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    await page.click('button:has-text("Close")');
    await page.waitForSelector("text=Game Settings", { state: "hidden" });
  });

  test("should display setup phase", async ({ page }) => {
    await expect(page.locator("text=Player Setup")).toBeVisible();
    await expect(
      page.locator("text=/Enter your name and secret number/")
    ).toBeVisible();
  });

  test("should show current player setup turn", async ({ page }) => {
    await expect(page.locator("text=/Player 1's turn to setup/")).toBeVisible();
  });

  test("should have name and number input fields", async ({ page }) => {
    await expect(
      page.locator('input[placeholder="Enter your name"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="Enter your secret number"]')
    ).toBeVisible();
  });

  test("should have save button", async ({ page }) => {
    await expect(
      page.locator('button:has-text("Save & Continue")')
    ).toBeVisible();
  });

  test("should allow entering player name and number", async ({ page }) => {
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    const numberInput = page.locator(
      'input[placeholder="Enter your secret number"]'
    );

    await nameInput.fill("Alice");
    await numberInput.fill("123");

    await expect(nameInput).toHaveValue("Alice");
    await expect(numberInput).toHaveValue("123");
  });

  test("should move to next player after saving", async ({ page }) => {
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await expect(page.locator("text=/Player 2's turn to setup/")).toBeVisible();
  });

  test("should submit setup with Enter key", async ({ page }) => {
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.press('input[placeholder="Enter your secret number"]', "Enter");

    await expect(page.locator("text=/Player 2's turn to setup/")).toBeVisible();
  });

  test("should use default name if none provided", async ({ page }) => {
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await expect(page.locator("text=/Player 2's turn to setup/")).toBeVisible();
  });

  test("should transition to guessing phase after all players setup", async ({
    page,
  }) => {
    // Setup Player 1
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    // Setup Player 2
    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');

    await expect(page.locator("text=Guessing Phase")).toBeVisible();
  });

  test("should pad short numbers with leading zeros during setup", async ({
    page,
  }) => {
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "12");
    await page.click('button:has-text("Save & Continue")');

    // Should accept and move to next player
    await expect(page.locator("text=/Player 2's turn to setup/")).toBeVisible();
  });
});

test.describe("Multiplayer Game - Guessing Phase", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('button[title="Game Settings"]');
    await page.waitForSelector("text=Game Settings", { state: "visible" });
    await page.selectOption("select#game-mode", "multi");
    await page.selectOption("select#player-count", "2");
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    await page.click('button:has-text("Close")');
    await page.waitForSelector("text=Game Settings", { state: "hidden" });

    // Setup both players
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');
  });

  test("should display guessing phase UI", async ({ page }) => {
    await expect(page.locator("text=Guessing Phase")).toBeVisible();
  });

  test("should show current guesser", async ({ page }) => {
    await expect(page.locator("text=/Alice's turn to guess/")).toBeVisible();
  });

  test("should display player cards", async ({ page }) => {
    await expect(
      page
        .locator(".text-center.font-bold.text-lg")
        .filter({ hasText: "Alice" })
    ).toBeVisible();
    await expect(
      page.locator(".text-center.font-bold.text-lg").filter({ hasText: "Bob" })
    ).toBeVisible();
  });

  test("should highlight active player", async ({ page }) => {
    const aliceCard = page
      .locator(".text-center.font-bold.text-lg")
      .filter({ hasText: "Alice" })
      .locator("..");
    await expect(aliceCard).toHaveClass(/ring-purple-300\/50/);
  });

  test("should have target player selector", async ({ page }) => {
    await expect(page.locator("select#target-player")).toBeVisible();
    await expect(page.locator("text=Guess for:")).toBeVisible();
  });

  test("should not allow guessing own number", async ({ page }) => {
    const select = page.locator("select#target-player");
    const options = await select.locator("option").allTextContents();

    // Alice is current guesser, so she shouldn't be in the list
    expect(options).not.toContain("Alice");
    expect(options).toContain("Bob");
  });

  test("should have guess input and submit button", async ({ page }) => {
    await expect(
      page.locator('input[placeholder="Enter guess"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("Submit Guess")')).toBeVisible();
  });

  test("should allow making a guess", async ({ page }) => {
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.click('button:has-text("Submit Guess")');

    // Guess should be recorded in Bob's card
    await expect(page.locator("text=/Alice: 456/")).toBeVisible();
  });

  test("should submit guess with Enter key", async ({ page }) => {
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.press('input[placeholder="Enter guess"]', "Enter");

    await expect(page.locator("text=/Alice: 456/")).toBeVisible();
  });

  test("should show feedback for incorrect guess", async ({ page }) => {
    await page.fill('input[placeholder="Enter guess"]', "789");
    await page.click('button:has-text("Submit Guess")');

    // Should show D: (digits) and P: (positions)
    await expect(page.locator("text=/D:\\d+, P:\\d+/")).toBeVisible();
  });

  test("should eliminate player when number is guessed correctly", async ({
    page,
  }) => {
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.click('button:has-text("Submit Guess")');

    // Bob should be eliminated
    await expect(page.locator("text=CORRECT!")).toBeVisible();
  });

  test("should show eliminated player with different styling", async ({
    page,
  }) => {
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.click('button:has-text("Submit Guess")');

    // Bob's card should have eliminated styling
    const bobCard = page
      .locator(".text-center.font-bold.text-lg")
      .filter({ hasText: "Bob" })
      .locator("..");
    await expect(bobCard).toHaveClass(/bg-red-400\/20/);
  });

  test("should end game when only one player remains", async ({ page }) => {
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=Game Over!")).toBeVisible();
    await expect(page.locator("text=/Alice wins!/")).toBeVisible();
  });

  test("should track multiple guesses per player", async ({ page }) => {
    // First guess
    await page.fill('input[placeholder="Enter guess"]', "111");
    await page.click('button:has-text("Submit Guess")');

    // Second guess (Bob's turn now)
    await page.fill('input[placeholder="Enter guess"]', "222");
    await page.click('button:has-text("Submit Guess")');

    // Third guess (Alice's turn again)
    await page.fill('input[placeholder="Enter guess"]', "333");
    await page.click('button:has-text("Submit Guess")');

    // Check that guesses are recorded
    const bobCard = page.locator("text=Bob").locator("..").locator("..");
    await expect(bobCard.locator("text=/Alice: 111/")).toBeVisible();
    await expect(bobCard.locator("text=/Alice: 333/")).toBeVisible();
  });

  test("should clear input after guess", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter guess"]');
    await input.fill("456");
    await page.click('button:has-text("Submit Guess")');

    await expect(input).toHaveValue("");
  });

  test("should pad short guesses with leading zeros", async ({ page }) => {
    await page.fill('input[placeholder="Enter guess"]', "12");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=/Alice: 012/")).toBeVisible();
  });
});

test.describe("Multiplayer Game - Three Players", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('button[title="Game Settings"]');
    await page.waitForSelector("text=Game Settings", { state: "visible" });
    await page.selectOption("select#game-mode", "multi");
    await page.selectOption("select#player-count", "3");
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    await page.click('button:has-text("Close")');
    await page.waitForSelector("text=Game Settings", { state: "hidden" });
  });

  test("should setup three players", async ({ page }) => {
    // Setup Player 1
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    // Setup Player 2
    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');

    // Setup Player 3
    await page.fill('input[placeholder="Enter your name"]', "Charlie");
    await page.fill('input[placeholder="Enter your secret number"]', "789");
    await page.click('button:has-text("Save & Continue")');

    await expect(page.locator("text=Guessing Phase")).toBeVisible();
    await expect(
      page
        .locator(".text-center.font-bold.text-lg")
        .filter({ hasText: "Alice" })
    ).toBeVisible();
    await expect(
      page.locator(".text-center.font-bold.text-lg").filter({ hasText: "Bob" })
    ).toBeVisible();
    await expect(
      page
        .locator(".text-center.font-bold.text-lg")
        .filter({ hasText: "Charlie" })
    ).toBeVisible();
  });

  test("should rotate turns among three players", async ({ page }) => {
    // Complete setup
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Charlie");
    await page.fill('input[placeholder="Enter your secret number"]', "789");
    await page.click('button:has-text("Save & Continue")');

    // Alice's turn
    await expect(page.locator("text=/Alice's turn to guess/")).toBeVisible();
    await page.fill('input[placeholder="Enter guess"]', "111");
    await page.click('button:has-text("Submit Guess")');

    // Bob's turn
    await expect(page.locator("text=/Bob's turn to guess/")).toBeVisible();
    await page.fill('input[placeholder="Enter guess"]', "222");
    await page.click('button:has-text("Submit Guess")');

    // Charlie's turn
    await expect(page.locator("text=/Charlie's turn to guess/")).toBeVisible();
  });

  test("should handle player elimination in three player game", async ({
    page,
  }) => {
    // Complete setup
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Charlie");
    await page.fill('input[placeholder="Enter your secret number"]', "789");
    await page.click('button:has-text("Save & Continue")');

    // Alice eliminates Bob
    await page.selectOption("select#target-player", "1"); // Bob
    await page.fill('input[placeholder="Enter guess"]', "456");
    await page.click('button:has-text("Submit Guess")');

    // Game should continue with Alice and Charlie
    await expect(page.locator("text=Game Over!")).not.toBeVisible();

    // Charlie's turn (or Alice's if turn rotation works)
    await page.waitForTimeout(500);

    // Eliminate Charlie
    await page.selectOption("select#target-player", "2"); // Charlie
    await page.fill('input[placeholder="Enter guess"]', "789");
    await page.click('button:has-text("Submit Guess")');

    // Now game should be over
    await expect(page.locator("text=Game Over!")).toBeVisible();
  });
});

test.describe("Multiplayer Game - Four Players", () => {
  test("should setup and play with four players", async ({ page }) => {
    await page.goto("/");
    await page.click('button[title="Game Settings"]');
    await page.waitForSelector("text=Game Settings", { state: "visible" });
    await page.selectOption("select#game-mode", "multi");
    await page.selectOption("select#player-count", "4");
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    await page.click('button:has-text("Close")');
    await page.waitForSelector("text=Game Settings", { state: "hidden" });

    // Setup all four players
    const players = [
      { name: "Alice", number: "123" },
      { name: "Bob", number: "456" },
      { name: "Charlie", number: "789" },
      { name: "Diana", number: "012" },
    ];

    for (const player of players) {
      await page.fill('input[placeholder="Enter your name"]', player.name);
      await page.fill(
        'input[placeholder="Enter your secret number"]',
        player.number
      );
      await page.click('button:has-text("Save & Continue")');
    }

    // Should be in guessing phase
    await expect(page.locator("text=Guessing Phase")).toBeVisible();

    // All players should be visible
    for (const player of players) {
      await expect(
        page
          .locator(".text-center.font-bold.text-lg")
          .filter({ hasText: player.name })
      ).toBeVisible();
    }
  });
});

test.describe("Multiplayer Game - New Game", () => {
  test("should restart multiplayer game", async ({ page }) => {
    await page.goto("/");
    await page.click('button[title="Game Settings"]');
    await page.waitForSelector("text=Game Settings", { state: "visible" });
    await page.selectOption("select#game-mode", "multi");
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    await page.click('button:has-text("Close")');
    await page.waitForSelector("text=Game Settings", { state: "hidden" });

    // Setup players
    await page.fill('input[placeholder="Enter your name"]', "Alice");
    await page.fill('input[placeholder="Enter your secret number"]', "123");
    await page.click('button:has-text("Save & Continue")');

    await page.fill('input[placeholder="Enter your name"]', "Bob");
    await page.fill('input[placeholder="Enter your secret number"]', "456");
    await page.click('button:has-text("Save & Continue")');

    // Make a guess
    await page.fill('input[placeholder="Enter guess"]', "111");
    await page.click('button:has-text("Submit Guess")');

    // Click New Game
    await page.click('button:has-text("New Game")');

    // Should be back to setup phase
    await expect(page.locator("text=Player Setup")).toBeVisible();
    await expect(page.locator("text=/Player 1's turn to setup/")).toBeVisible();
  });
});

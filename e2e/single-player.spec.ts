import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5
  })
  await page.route("https://api.github.com/repos/PePoDev/number-guesser", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ stargazers_count: 128 }),
    });
  });
});

test.describe("Single Player Game", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display game title and instructions", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Number Guessing Game");
    await page.getByRole("button", { name: /Instructions/ }).click();
    await expect(page.locator("text=How to Play:")).toBeVisible();
    await page.getByRole("button", { name: /Instructions/ }).click();
    await expect(page.locator("text=How to Play:")).not.toBeVisible();
  });

  test("should adapt the stage between mobile and desktop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".hero")).toBeHidden();
    await expect(
      page
        .getByRole("navigation", { name: "Game navigation" })
        .getByRole("button", { name: /Single Player/ })
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="Enter number"]')
    ).toBeVisible();
    const mobileNav = page.getByRole("navigation", {
      name: "Game navigation",
    });
    expect(
      await mobileNav.evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true);
    for (const name of [/Single Player/, /Multiplayer/, /Instructions/, /New Game/]) {
      await expect(mobileNav.getByRole('button', { name })).toBeInViewport({
        ratio: 1,
      })
    }
    await expect(page.locator(".ticker-seq").first()).toHaveCSS(
      "white-space",
      "normal"
    );

    await page.setViewportSize({ width: 840, height: 800 })
    const navTops = await mobileNav
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().top),
      )
    expect(new Set(navTops).size).toBe(1)
    await expect(page.getByLabel('Guess', { exact: true })).toBeInViewport()
    const settingsIcon = await page
      .getByRole('button', { name: 'Open Single Player settings' })
      .boundingBox()
    const githubIcon = await page
      .getByRole('link', { name: /Open number-guesser on GitHub/ })
      .boundingBox()
    expect(settingsIcon?.y).toBe(githubIcon?.y)
    expect(settingsIcon?.width).toBe(settingsIcon?.height)
    expect(
      (githubIcon?.x ?? 0) - (settingsIcon?.x ?? 0) - (settingsIcon?.width ?? 0),
    ).toBeLessThanOrEqual(12)

    await page.setViewportSize({ width: 640, height: 360 });
    await page.getByLabel("Open Single Player settings").click();
    await expect(page.getByRole("dialog")).toHaveCSS("overflow-y", "auto");
    await page
      .getByRole("button", { name: "Close", exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(page.locator(".hero")).toBeVisible();
    const singlePlayerCard = await mobileNav
      .getByRole('button', { name: /Single Player/ })
      .boundingBox()
    const newGameCard = await mobileNav
      .getByRole('button', { name: /New Game/ })
      .boundingBox()
    expect(newGameCard?.height).toBeLessThan(singlePlayerCard?.height ?? 0)
  });

  test('keeps notepad marks while guessing and clears them on New Game', async ({
    page,
  }) => {
    await page.getByRole('button', { name: '4, not marked' }).click()
    await page.getByRole('button', { name: '4, ruled out' }).click()
    const input = page.getByLabel('Guess', { exact: true })
    await input.fill('123')
    await input.press('Enter')

    await expect(
      page.getByRole('button', { name: '4, in the answer' }),
    ).toBeVisible()

    await page.getByRole('button', { name: /New Game/ }).click()

    await expect(page.getByRole('button', { name: '4, not marked' })).toBeVisible()
  })

  test('offers Play again after the game ends', async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.5
    })
    await page.goto('/')
    const input = page.getByLabel('Guess', { exact: true })

    for (const guess of ['123', '456', '789', '012', '345', '678', '901']) {
      await input.fill(guess)
      await input.press('Enter')
    }
    await expect(page.getByText(/The correct number was:/)).toBeVisible()
    await expect(page.getByText('500', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Play again' }).click()

    await expect(page.getByText(/Game Over/)).toBeHidden()
    await expect(page.getByText(/No guesses yet/)).toBeVisible()
    await expect(input).toBeEnabled()
    await expect(input).toBeFocused()
  })

  test("should show digit count and attempts remaining", async ({ page }) => {
    await expect(page.locator("text=/\\d+-digit number/")).toBeVisible();
    await expect(page.locator("text=/\\d+ attempts remaining/")).toBeVisible();
  });

  test("should have input field and submit button", async ({ page }) => {
    await expect(
      page.locator('input[placeholder="Enter number"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("Submit Guess")')).toBeVisible();
  });

  test("should allow entering a guess", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("123");
    await expect(input).toHaveValue("123");
  });

  test("should keep only digits in a guess", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');

    await input.fill("0a1-2");

    await expect(input).toHaveValue("012");
  });

  test("should submit guess and show feedback", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("123");
    await page.click('button:has-text("Submit Guess")');

    // Should show feedback
    await expect(page.locator("text=/Correct digits:/")).toBeVisible();
    await expect(page.locator("text=/Correct positions:/")).toBeVisible();
  });

  test("should add guess to history", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("123");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=Guess 1: 123")).toBeVisible();
  });

  test("should submit guess with Enter key", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("456");
    await input.press("Enter");

    await expect(page.locator("text=Guess 1: 456")).toBeVisible();
  });

  test("should decrement attempts after each guess", async ({ page }) => {
    // Get initial attempts
    const initialText = await page
      .locator("text=/\\d+ attempts remaining/")
      .textContent();
    const initialAttempts = parseInt(initialText?.match(/\d+/)?.[0] || "0");

    // Make a guess
    await page.fill('input[placeholder="Enter number"]', "123");
    await page.click('button:has-text("Submit Guess")');

    // Check attempts decreased
    const newText = await page
      .locator("text=/\\d+ attempts remaining/")
      .textContent();
    const newAttempts = parseInt(newText?.match(/\d+/)?.[0] || "0");

    expect(newAttempts).toBe(initialAttempts - 1);
  });

  test("should show validation error for wrong length", async ({ page }) => {
    await page.fill('input[placeholder="Enter number"]', "12");
    await page.click('button:has-text("Submit Guess")');

    await expect(
      page.locator("text=/Please enter exactly 3 digits/")
    ).toBeVisible();
  });

  test("should treat filtered non-digit input as empty", async ({ page }) => {
    await page.fill('input[placeholder="Enter number"]', "abc");
    await page.click('button:has-text("Submit Guess")');

    await expect(
      page.locator("text=/Please enter a number before submitting/")
    ).toBeVisible();
  });

  test("should show validation error for single digit input", async ({
    page,
  }) => {
    await page.fill('input[placeholder="Enter number"]', "1");
    await page.click('button:has-text("Submit Guess")');

    await expect(
      page.locator("text=/Please enter exactly \\d+ digits/")
    ).toBeVisible();
  });

  test("should clear input after successful guess", async ({ page }) => {
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("123");
    await page.click('button:has-text("Submit Guess")');

    await expect(input).toHaveValue("");
  });

  test("should track multiple guesses in history", async ({ page }) => {
    // First guess
    await page.fill('input[placeholder="Enter number"]', "123");
    await page.click('button:has-text("Submit Guess")');

    // Second guess
    await page.fill('input[placeholder="Enter number"]', "456");
    await page.click('button:has-text("Submit Guess")');

    // Third guess
    await page.fill('input[placeholder="Enter number"]', "789");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=Guess 1:")).toBeVisible();
    await expect(page.locator("text=Guess 2:")).toBeVisible();
    await expect(page.locator("text=Guess 3:")).toBeVisible();
  });

  test("should disable input when game is over", async ({ page }) => {
    // Make guesses until game over (assuming 7 attempts)
    for (let i = 0; i < 7; i++) {
      await page.fill('input[placeholder="Enter number"]', `${i}99`);
      await page.click('button:has-text("Submit Guess")');
    }

    // Input should be disabled
    const input = page.locator('input[placeholder="Enter number"]');
    await expect(input).toBeDisabled();
  });

  test("should show game over message when attempts exhausted", async ({
    page,
  }) => {
    // Make 7 wrong guesses
    for (let i = 0; i < 7; i++) {
      await page.fill('input[placeholder="Enter number"]', `${i}99`);
      await page.click('button:has-text("Submit Guess")');
    }

    await expect(page.locator("text=/Game Over/")).toBeVisible();
    await expect(page.locator("text=/The correct number was:/")).toBeVisible();
  });

  test("should start new game when New Game button clicked", async ({
    page,
  }) => {
    // Make a guess
    await page.fill('input[placeholder="Enter number"]', "123");
    await page.click('button:has-text("Submit Guess")');

    // Click New Game
    await page.click('button:has-text("New Game")');

    // History should be cleared
    await expect(page.locator("text=Guess 1:")).not.toBeVisible();
  });

  test("should open settings modal", async ({ page }) => {
    await page.getByLabel("Open Single Player settings").click();
    await expect(page.locator("text=Single Player Settings")).toBeVisible();
  });

  test("should change digit count in settings", async ({ page }) => {
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#digit-count", "4");
    await page.click('button:has-text("Close")');

    await expect(page.locator("text=/4-digit number/")).toBeVisible();
  });

  test("should change max attempts in settings", async ({ page }) => {
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#max-attempts", "10");
    await page.click('button:has-text("Close")');

    await expect(page.locator("text=/10 attempts remaining/")).toBeVisible();
  });

  test("should respect new digit count after settings change", async ({
    page,
  }) => {
    // Change to 4 digits
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#digit-count", "4");
    await page.click('button:has-text("Close")');

    // Input should keep at most 4 digits
    const input = page.locator('input[placeholder="Enter number"]');
    await input.fill("12345");
    await expect(input).toHaveValue("1234");
  });

  test("should show guess history section", async ({ page }) => {
    await expect(page.locator("text=Guess History:")).toBeVisible();
  });

  test("should display feedback with correct styling", async ({ page }) => {
    await page.fill('input[placeholder="Enter number"]', "123");
    await page.click('button:has-text("Submit Guess")');

    // Feedback should have appropriate styling
    const feedback = page.locator("text=/Correct digits:/").locator("..");
    await expect(feedback).toBeVisible();
  });

  test("should handle rapid consecutive guesses", async ({ page }) => {
    // Make 3 quick guesses
    for (let i = 0; i < 3; i++) {
      await page.fill('input[placeholder="Enter number"]', `${i}23`);
      await page.press('input[placeholder="Enter number"]', "Enter");
      await page.waitForTimeout(100);
    }

    // All guesses should be recorded
    await expect(page.locator("text=Guess 1:")).toBeVisible();
    await expect(page.locator("text=Guess 2:")).toBeVisible();
    await expect(page.locator("text=Guess 3:")).toBeVisible();
  });

  test("should maintain game state during settings modal interaction", async ({
    page,
  }) => {
    // Make a guess
    await page.fill('input[placeholder="Enter number"]', "123");
    await page.click('button:has-text("Submit Guess")');

    // Open and close settings without changing anything
    await page.getByLabel("Open Single Player settings").click();
    await page.click('button:has-text("Close")');

    // Guess history should still be visible
    await expect(page.locator("text=Guess 1:")).toBeVisible();
  });
});

test.describe("Single Player Game - Different Configurations", () => {
  test("should work with 2-digit numbers", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#digit-count", "2");
    await page.click('button:has-text("Close")');

    await page.fill('input[placeholder="Enter number"]', "12");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=Guess 1: 12")).toBeVisible();
  });

  test("should work with 5-digit numbers", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#digit-count", "5");
    await page.click('button:has-text("Close")');

    await page.fill('input[placeholder="Enter number"]', "12345");
    await page.click('button:has-text("Submit Guess")');

    await expect(page.locator("text=Guess 1: 12345")).toBeVisible();
  });

  test("should work with 3 attempts limit", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#max-attempts", "3");
    await page.click('button:has-text("Close")');

    await expect(page.locator("text=/3 attempts remaining/")).toBeVisible();
  });

  test("should work with 20 attempts limit", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open Single Player settings").click();
    await page.selectOption("select#max-attempts", "20");
    await page.click('button:has-text("Close")');

    await expect(page.locator("text=/20 attempts remaining/")).toBeVisible();
  });

  test.describe("Single Player Game - Duplicate Guess Detection", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Open Single Player settings").click();
      await page.waitForSelector("text=Single Player Settings", { state: "visible" });
      // Wait for any animations to complete
      await page.waitForTimeout(500);
      await page.click('button:has-text("Close")');
      await page.waitForSelector("text=Single Player Settings", { state: "hidden" });
    });

    test("should detect and reject duplicate guesses", async ({ page }) => {
      // Make first guess
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      await expect(page.locator("text=Guess 1: 123")).toBeVisible();

      // Try to make the same guess again
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      // Should show duplicate error message
      await expect(
        page.locator("text=/You've already guessed 123/")
      ).toBeVisible();

      // Should not add duplicate to history
      await expect(page.locator("text=Guess 2:")).not.toBeVisible();
    });

    test("should not count duplicate guess against attempts", async ({
      page,
    }) => {
      // Get initial attempts
      const initialText = await page
        .locator("text=/\\d+ attempts remaining/")
        .textContent();
      const initialAttempts = parseInt(initialText?.match(/\d+/)?.[0] || "0");

      // Make first guess
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      // Get attempts after first guess
      const afterFirstText = await page
        .locator("text=/\\d+ attempts remaining/")
        .textContent();
      const afterFirstAttempts = parseInt(
        afterFirstText?.match(/\d+/)?.[0] || "0"
      );

      expect(afterFirstAttempts).toBe(initialAttempts - 1);

      // Try duplicate guess
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      await expect(
        page.locator("text=/You've already guessed 123/")
      ).toBeVisible();

      // Attempts should remain the same
      const afterDuplicateText = await page
        .locator("text=/\\d+ attempts remaining/")
        .textContent();
      const afterDuplicateAttempts = parseInt(
        afterDuplicateText?.match(/\d+/)?.[0] || "0"
      );

      expect(afterDuplicateAttempts).toBe(afterFirstAttempts);
    });

    test("should allow different guesses after duplicate error", async ({
      page,
    }) => {
      // Make first guess
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      await expect(page.locator("text=Guess 1: 123")).toBeVisible();

      // Try duplicate
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      await expect(
        page.locator("text=/You've already guessed 123/")
      ).toBeVisible();

      // Make a different guess
      await page.fill('input[placeholder="Enter number"]', "456");
      await page.click('button:has-text("Submit Guess")');

      // Should be accepted
      await expect(page.locator("text=Guess 2: 456")).toBeVisible();
    });

    test("should track multiple unique guesses correctly", async ({ page }) => {
      const guesses = ["123", "456", "789"];

      for (let i = 0; i < guesses.length; i++) {
        await page.fill('input[placeholder="Enter number"]', guesses[i]);
        await page.click('button:has-text("Submit Guess")');
        await expect(
          page.locator(`text=Guess ${i + 1}: ${guesses[i]}`)
        ).toBeVisible();
      }

      // Try to repeat the first guess
      await page.fill('input[placeholder="Enter number"]', "123");
      await page.click('button:has-text("Submit Guess")');

      await expect(
        page.locator("text=/You've already guessed 123/")
      ).toBeVisible();
      await expect(page.locator("text=Guess 4:")).not.toBeVisible();
    });

    test.describe("Single Player Game - Input Validation", () => {
      test.beforeEach(async ({ page }) => {
        await page.goto("/");
      });

      test("should prevent submission with empty input", async ({ page }) => {
        // Try to submit without entering anything
        await page.click('button:has-text("Submit Guess")');

        // Should show validation error
        await expect(
          page.locator("text=/Please enter a number before submitting/")
        ).toBeVisible();

        // Should not add to history
        await expect(page.locator("text=Guess 1:")).not.toBeVisible();
      });

      test("should show validation errors with warning styling", async ({
        page,
      }) => {
        // Try to submit empty
        await page.click('button:has-text("Submit Guess")');

        // Check for warning styling
        const feedback = page.locator(
          "text=/Please enter a number before submitting/"
        );
        await expect(feedback).toHaveClass(/banner/);
        await expect(feedback).toHaveClass(/banner-warning/);
      });

      test("should allow valid submission after validation error", async ({
        page,
      }) => {
        // Try to submit empty
        await page.click('button:has-text("Submit Guess")');

        await expect(
          page.locator("text=/Please enter a number before submitting/")
        ).toBeVisible();

        // Now enter a valid guess
        await page.fill('input[placeholder="Enter number"]', "123");
        await page.click('button:has-text("Submit Guess")');

        // Should be accepted
        await expect(page.locator("text=Guess 1: 123")).toBeVisible();
      });

      test("should not count validation errors against attempts", async ({
        page,
      }) => {
        // Get initial attempts
        const initialText = await page
          .locator("text=/\\d+ attempts remaining/")
          .textContent();
        const initialAttempts = parseInt(initialText?.match(/\d+/)?.[0] || "0");

        // Try to submit empty (validation error)
        await page.click('button:has-text("Submit Guess")');

        await expect(
          page.locator("text=/Please enter a number before submitting/")
        ).toBeVisible();

        // Attempts should remain the same
        const afterErrorText = await page
          .locator("text=/\\d+ attempts remaining/")
          .textContent();
        const afterErrorAttempts = parseInt(
          afterErrorText?.match(/\d+/)?.[0] || "0"
        );

        expect(afterErrorAttempts).toBe(initialAttempts);
      });

      test("should validate digit count correctly", async ({ page }) => {
        // Try to submit a number with wrong length (too short)
        await page.fill('input[placeholder="Enter number"]', "12");
        await page.click('button:has-text("Submit Guess")');

        // Should show validation error
        await expect(
          page.locator("text=/Please enter exactly \\d+ digits/")
        ).toBeVisible();
      });

      test("should handle multiple validation errors in sequence", async ({
        page,
      }) => {
        // First error: empty input
        await page.click('button:has-text("Submit Guess")');
        await expect(
          page.locator("text=/Please enter a number before submitting/")
        ).toBeVisible();

        // Second error: filtered non-digit input
        await page.fill('input[placeholder="Enter number"]', "abc");
        await page.click('button:has-text("Submit Guess")');
        await expect(
          page.locator("text=/Please enter a number before submitting/")
        ).toBeVisible();

        // Finally, valid input
        await page.fill('input[placeholder="Enter number"]', "123");
        await page.click('button:has-text("Submit Guess")');
        await expect(page.locator("text=Guess 1: 123")).toBeVisible();
      });
    });
  });
});

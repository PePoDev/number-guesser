import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { get } from "svelte/store";
import MultiPlayerGame from "./MultiPlayerGame.svelte";
import { gameStore } from "$lib/stores/gameStore";

describe("MultiPlayerGame Component", () => {
  beforeEach(() => {
    gameStore.reset();
    gameStore.setMode("multi");
    gameStore.updateSettings({ playerCount: 2 });
    gameStore.startNewGame();
  });

  describe("Setup Phase", () => {
    it("should render setup phase UI", () => {
      render(MultiPlayerGame);

      expect(screen.getByText("Player Setup")).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your name and secret number/)
      ).toBeInTheDocument();
    });

    it("should show current player setup turn", () => {
      render(MultiPlayerGame);
      expect(screen.getByText(/Player 1's turn to setup/)).toBeInTheDocument();
    });

    it("should have name and number inputs", () => {
      render(MultiPlayerGame);

      expect(
        screen.getByPlaceholderText("Enter your name")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your secret number")
      ).toBeInTheDocument();
    });

    it("should have save button", () => {
      render(MultiPlayerGame);
      expect(screen.getByText("Save & Continue")).toBeInTheDocument();
    });

    it('keeps only digits in local secret numbers', async () => {
      render(MultiPlayerGame)
      const input = screen.getByPlaceholderText('Enter your secret number')

      await fireEvent.input(input, { target: { value: '0a1-2' } })

      expect(input).toHaveValue('012')
    })

    it("should show inline feedback when the secret is empty", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      await user.click(screen.getByText("Save & Continue"));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a secret number."
      );
    });

    it("should allow entering player name and number", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      const nameInput = screen.getByPlaceholderText(
        "Enter your name"
      ) as HTMLInputElement;
      const numberInput = screen.getByPlaceholderText(
        "Enter your secret number"
      ) as HTMLInputElement;

      await user.type(nameInput, "Alice");
      await user.type(numberInput, "123");

      expect(nameInput.value).toBe("Alice");
      expect(numberInput.value).toBe("123");
    });

    it("should save player setup and move to next player", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      const nameInput = screen.getByPlaceholderText("Enter your name");
      const numberInput = screen.getByPlaceholderText(
        "Enter your secret number"
      );
      const saveButton = screen.getByText("Save & Continue");

      await user.type(nameInput, "Alice");
      await user.type(numberInput, "123");
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Player 2's turn to setup/)
        ).toBeInTheDocument();
      });
    });

    it("should use default name if none provided", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      const numberInput = screen.getByPlaceholderText(
        "Enter your secret number"
      );
      const saveButton = screen.getByText("Save & Continue");

      await user.type(numberInput, "123");
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Player 2's turn to setup/)
        ).toBeInTheDocument();
      });
    });

    it("should transition to guessing phase after all players setup", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      // Setup Player 1
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => {
        expect(
          screen.getByText(/Player 2's turn to setup/)
        ).toBeInTheDocument();
      });

      // Setup Player 2
      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => {
        expect(screen.getByText("Guessing Phase")).toBeInTheDocument();
      });
    });

    it("should submit on Enter key press", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123{Enter}"
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Player 2's turn to setup/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Guessing Phase", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      // Setup both players
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText("Guessing Phase"));
    });

    it("should render guessing phase UI", () => {
      expect(screen.getByText("Guessing Phase")).toBeInTheDocument();
    });

    it("should show current guesser", () => {
      expect(screen.getByText(/Alice's turn to guess/)).toBeInTheDocument();
    });

    it("should display player cards", () => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    });

    it("should have target player selector", () => {
      expect(screen.getByLabelText("Guess for:")).toBeInTheDocument();
    });

    it("should have guess input and submit button", () => {
      expect(screen.getByRole("textbox", { name: "Guess" })).toBeInTheDocument();
      expect(screen.getByText("Submit Guess")).toBeInTheDocument();
    });

    it('keeps only digits in local guesses', async () => {
      const input = screen.getByLabelText('Guess')

      await fireEvent.input(input, { target: { value: '4x5-6' } })

      expect(input).toHaveValue('456')
    })

    it("should announce the current turn", () => {
      expect(screen.getByText(/Alice's turn to guess/)).toHaveAttribute(
        "aria-live",
        "polite"
      );
    });

    it("should allow making a guess", async () => {
      const user = userEvent.setup();

      const guessInput = screen.getByPlaceholderText("Enter guess");
      await user.type(guessInput, "456");
      await user.click(screen.getByText("Submit Guess"));

      await waitFor(() => {
        // Check that game ended (Alice guessed Bob's number correctly)
        expect(screen.getByText("Game Over!")).toBeInTheDocument();
      });
    });

    it("should mark the newest guess in history", async () => {
      const user = userEvent.setup();

      await user.type(screen.getByRole("textbox", { name: "Guess" }), "111");
      await user.click(screen.getByText("Submit Guess"));

      const row = screen.getByText(/Alice: 111/).closest(".history-row");
      expect(row).toHaveClass("history-row-newest");
    });

    it("should submit guess on Enter key", async () => {
      const user = userEvent.setup();

      const guessInput = screen.getByPlaceholderText("Enter guess");
      await user.type(guessInput, "456{Enter}");

      await waitFor(() => {
        // Check that game ended (Alice guessed Bob's number correctly)
        expect(screen.getByText("Game Over!")).toBeInTheDocument();
      });
    });

    it("should highlight active player", () => {
      const aliceCard = screen.getByRole("group", { name: "Alice" });
      expect(aliceCard).toHaveClass("player-card-turn");
    });

    it("should not allow guessing own number", () => {
      const select = screen.getByLabelText("Guess for:") as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.text);

      // Alice is current guesser, so she shouldn't be in the target list
      expect(options).not.toContain("Alice");
      expect(options).toContain("Bob");
    });
  });

  describe("Finished Phase", () => {
    it("should show winner when game ends", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      // Setup players
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText("Guessing Phase"));

      // Alice guesses Bob's number correctly
      await user.type(screen.getByPlaceholderText("Enter guess"), "456");
      await user.click(screen.getByText("Submit Guess"));

      await waitFor(() => {
        expect(screen.getByText("Game Over!")).toBeInTheDocument();
        expect(screen.getByText(/Alice wins!/)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Submit Guess" })
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("group", { name: "Bob eliminated" })
        ).toHaveTextContent("Eliminated");
      });
    });
  });

  describe("Three Player Game", () => {
    beforeEach(() => {
      gameStore.reset();
      gameStore.setMode("multi");
      gameStore.updateSettings({ playerCount: 3 });
      gameStore.startNewGame();
    });

    it("should handle three player setup", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      // Setup Player 1
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      // Setup Player 2
      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 3's turn to setup/));

      // Setup Player 3
      await user.type(
        screen.getByPlaceholderText("Enter your name"),
        "Charlie"
      );
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "789"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => {
        expect(screen.getByText("Guessing Phase")).toBeInTheDocument();
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Charlie").length).toBeGreaterThan(0);
      });
    });

    it("should pad short numbers with leading zeros during setup", async () => {
      const user = userEvent.setup();
      render(MultiPlayerGame);

      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "12"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => {
        expect(
          screen.getByText(/Player 2's turn to setup/)
        ).toBeInTheDocument();
      });

      // Verify the number was padded to 012
      expect(get(gameStore).players[0].number).toBe("012");
    });

    it("should filter a non-digit guess before submission", async () => {
      const user = userEvent.setup();

      // Reset and configure for 2 players
      gameStore.reset();
      gameStore.setMode("multi");
      gameStore.updateSettings({ playerCount: 2 });
      gameStore.startNewGame();

      render(MultiPlayerGame);

      // Setup both players
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText("Guessing Phase"), {
        timeout: 3000,
      });

      const input = screen.getByPlaceholderText("Enter guess");
      const guessCount = get(gameStore).players.reduce(
        (total, player) => total + player.guesses.length,
        0,
      );
      await user.type(input, "abc");
      await user.click(screen.getByText("Submit Guess"));

      expect(input).toHaveValue("");
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a number before submitting.",
      );
      expect(
        get(gameStore).players.reduce(
          (total, player) => total + player.guesses.length,
          0,
        ),
      ).toBe(guessCount);
    });

    it("should pad short guesses with leading zeros", async () => {
      const user = userEvent.setup();

      // Reset and configure for 2 players
      gameStore.reset();
      gameStore.setMode("multi");
      gameStore.updateSettings({ playerCount: 2 });
      gameStore.startNewGame();

      render(MultiPlayerGame);

      // Setup both players
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "012"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText("Guessing Phase"), {
        timeout: 3000,
      });

      // Make a guess with short number that should be padded
      await user.type(screen.getByPlaceholderText("Enter guess"), "12");
      await user.click(screen.getByText("Submit Guess"));

      // The guess should be padded to 012 and match Bob's number
      await waitFor(() => {
        expect(screen.getByText("Game Over!")).toBeInTheDocument();
      });
    });

    it("should move to next guesser after incorrect guess", async () => {
      const user = userEvent.setup();
      gameStore.reset();
      gameStore.setMode("multi");
      gameStore.updateSettings({ playerCount: 3 });
      gameStore.startNewGame();

      render(MultiPlayerGame);

      // Setup three players
      await user.type(screen.getByPlaceholderText("Enter your name"), "Alice");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "123"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 2's turn to setup/));

      await user.type(screen.getByPlaceholderText("Enter your name"), "Bob");
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "456"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText(/Player 3's turn to setup/));

      await user.type(
        screen.getByPlaceholderText("Enter your name"),
        "Charlie"
      );
      await user.type(
        screen.getByPlaceholderText("Enter your secret number"),
        "789"
      );
      await user.click(screen.getByText("Save & Continue"));

      await waitFor(() => screen.getByText("Guessing Phase"));

      // Alice's turn - make incorrect guess
      expect(screen.getByText(/Alice's turn to guess/)).toBeInTheDocument();

      await user.type(screen.getByPlaceholderText("Enter guess"), "11");
      await user.click(screen.getByText("Submit Guess"));

      // Should move to Bob's turn
      await waitFor(() => {
        expect(screen.getByText(/Bob's turn to guess/)).toBeInTheDocument();
      });
    });
  });
});

describe('MultiPlayerGame in Thai', () => {
	beforeEach(() => {
		gameStore.reset()
		gameStore.setLocale('th')
		gameStore.setMode('multi')
		gameStore.updateSettings({ playerCount: 2 })
		gameStore.startNewGame()
	})

	it('names unnamed players in the active language', async () => {
		render(MultiPlayerGame)

		expect(screen.getByText('ถึงตา ผู้เล่น 1 ตั้งค่า')).toBeInTheDocument()

		gameStore.setLocale('en')

		await waitFor(() => {
			expect(screen.getByText("Player 1's turn to setup")).toBeInTheDocument()
		})
	})

	it('keeps a blank name so the default follows the language', async () => {
		const user = userEvent.setup()
		render(MultiPlayerGame)

		await user.type(screen.getByLabelText('เลขลับ:'), '123')
		await user.click(screen.getByRole('button', { name: 'บันทึกและไปต่อ' }))

		expect(screen.getByText('ถึงตา ผู้เล่น 2 ตั้งค่า')).toBeInTheDocument()
		expect(get(gameStore).players[0].name).toBe('')
	})

	it('shows Thai validation and guessing copy', async () => {
		const user = userEvent.setup()
		render(MultiPlayerGame)

		await user.click(screen.getByRole('button', { name: 'บันทึกและไปต่อ' }))
		expect(screen.getByRole('alert')).toHaveTextContent('กรุณาใส่เลขลับ')

		for (const secret of ['123', '456']) {
			await user.type(screen.getByLabelText('เลขลับ:'), secret)
			await user.click(screen.getByRole('button', { name: 'บันทึกและไปต่อ' }))
		}

		expect(screen.getByText('ช่วงทายเลข')).toBeInTheDocument()
		expect(screen.getByText('ถึงตา ผู้เล่น 1 ทาย')).toBeInTheDocument()
		expect(screen.getByLabelText('ทายเลขของ:')).toHaveDisplayValue('ผู้เล่น 2')
	})
})

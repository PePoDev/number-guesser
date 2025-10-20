import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
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
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should have target player selector", () => {
      expect(screen.getByLabelText("Guess for:")).toBeInTheDocument();
    });

    it("should have guess input and submit button", () => {
      expect(screen.getByPlaceholderText("Enter guess")).toBeInTheDocument();
      expect(screen.getByText("Submit Guess")).toBeInTheDocument();
    });

    it("should allow making a guess", async () => {
      const user = userEvent.setup();

      const guessInput = screen.getByPlaceholderText("Enter guess");
      await user.type(guessInput, "456");
      await user.click(screen.getByText("Submit Guess"));

      await waitFor(() => {
        // Check that guess was recorded
        const bobCard = screen.getByText("Bob").closest("div");
        expect(bobCard).toBeInTheDocument();
      });
    });

    it("should submit guess on Enter key", async () => {
      const user = userEvent.setup();

      const guessInput = screen.getByPlaceholderText("Enter guess");
      await user.type(guessInput, "456{Enter}");

      await waitFor(() => {
        const bobCard = screen.getByText("Bob").closest("div");
        expect(bobCard).toBeInTheDocument();
      });
    });

    it("should highlight active player", () => {
      const aliceCard = screen.getByText("Alice").closest("div");
      expect(aliceCard).toHaveClass("ring-4", "ring-purple-300");
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
        expect(screen.getByText("Bob")).toBeInTheDocument();
        expect(screen.getByText("Charlie")).toBeInTheDocument();
      });
    });
  });
});

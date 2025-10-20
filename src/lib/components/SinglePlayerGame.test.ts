import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import SinglePlayerGame from "./SinglePlayerGame.svelte";
import { gameStore } from "$lib/stores/gameStore";

describe("SinglePlayerGame Component", () => {
  beforeEach(() => {
    gameStore.reset();
    gameStore.setMode("single");
    gameStore.startNewGame();
  });

  it("should render input and submit button", () => {
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it("should allow user to type in input", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText(
      "Enter number"
    ) as HTMLInputElement;
    await user.type(input, "123");

    expect(input.value).toBe("123");
  });

  it("should submit guess on button click", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    await user.type(input, "123");
    await user.click(button);

    // Check that guess was added to history
    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });
  });

  it("should submit guess on Enter key press", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");

    await user.type(input, "123{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });
  });

  it("should display feedback after guess", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    await user.type(input, "123");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Correct digits:/)).toBeInTheDocument();
    });
  });

  it("should clear input after successful guess", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText(
      "Enter number"
    ) as HTMLInputElement;

    await user.type(input, "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("should show validation error for wrong length", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");

    await user.type(input, "12");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter exactly 3 digits/)
      ).toBeInTheDocument();
    });
  });

  it("should show validation error for invalid input", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");

    await user.type(input, "abc");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid number/)
      ).toBeInTheDocument();
    });
  });

  it("should disable input and button when game is over", async () => {
    render(SinglePlayerGame);

    gameStore.setGameOver(true);

    await waitFor(() => {
      const input = screen.getByPlaceholderText("Enter number");
      const button = screen.getByText("Submit Guess");

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });

  it("should display guess history", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    // Make multiple guesses
    await user.type(input, "123");
    await user.click(button);

    await user.type(input, "456");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
      expect(screen.getByText(/Guess 2:/)).toBeInTheDocument();
    });
  });

  it("should show guess history section", () => {
    render(SinglePlayerGame);
    expect(screen.getByText("Guess History:")).toBeInTheDocument();
  });

  it("should respect maxlength attribute", () => {
    render(SinglePlayerGame);
    const input = screen.getByPlaceholderText(
      "Enter number"
    ) as HTMLInputElement;
    expect(input.maxLength).toBe(3);
  });

  it("should have numeric pattern", () => {
    render(SinglePlayerGame);
    const input = screen.getByPlaceholderText(
      "Enter number"
    ) as HTMLInputElement;
    expect(input.pattern).toBe("[0-9]*");
  });

  it("should detect and reject duplicate guesses", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    // Make first guess
    await user.type(input, "123");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });

    // Try to make the same guess again
    await user.type(input, "123");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/You've already guessed 123/)
      ).toBeInTheDocument();
    });

    // Should not add duplicate to history
    expect(screen.queryByText(/Guess 2:/)).not.toBeInTheDocument();
  });

  it("should not count duplicate guess against attempts", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    // Get initial attempts
    const initialText = await screen.getByText(/\d+ attempts remaining/)
      .textContent;
    const initialAttempts = parseInt(initialText?.match(/\d+/)?.[0] || "0");

    // Make first guess
    await user.type(screen.getByPlaceholderText("Enter number"), "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });

    // Get attempts after first guess
    const afterFirstText = await screen.getByText(/\d+ attempts remaining/)
      .textContent;
    const afterFirstAttempts = parseInt(
      afterFirstText?.match(/\d+/)?.[0] || "0"
    );

    expect(afterFirstAttempts).toBe(initialAttempts - 1);

    // Try duplicate guess
    await user.type(screen.getByPlaceholderText("Enter number"), "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(
        screen.getByText(/You've already guessed 123/)
      ).toBeInTheDocument();
    });

    // Attempts should remain the same
    const afterDuplicateText = await screen.getByText(/\d+ attempts remaining/)
      .textContent;
    const afterDuplicateAttempts = parseInt(
      afterDuplicateText?.match(/\d+/)?.[0] || "0"
    );

    expect(afterDuplicateAttempts).toBe(afterFirstAttempts);
  });

  it("should prevent submission with empty input", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const button = screen.getByText("Submit Guess");

    // Try to submit without entering anything
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a number before submitting/)
      ).toBeInTheDocument();
    });

    // Should not add to history
    expect(screen.queryByText(/Guess 1:/)).not.toBeInTheDocument();
  });

  it("should show validation errors in yellow", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const button = screen.getByText("Submit Guess");

    // Try to submit empty
    await user.click(button);

    await waitFor(() => {
      const feedback = screen.getByText(
        /Please enter a number before submitting/
      ).parentElement;
      expect(feedback).toHaveClass("bg-yellow-100");
      expect(feedback).toHaveClass("text-yellow-800");
      expect(feedback).toHaveClass("border-yellow-300");
    });
  });

  it("should allow valid submission after validation error", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");
    const button = screen.getByText("Submit Guess");

    // Try to submit empty
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a number before submitting/)
      ).toBeInTheDocument();
    });

    // Now enter a valid guess
    await user.type(input, "123");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });
  });
});

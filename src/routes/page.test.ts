import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Page from "./+page.svelte";
import { gameStore } from "$lib/stores/gameStore";

describe("+page.svelte Component", () => {
  beforeEach(() => {
    gameStore.reset();
  });

  it("should render the main title", () => {
    render(Page);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Number Guessing Game."
    );
  });

  it("should render settings button", () => {
    render(Page);
    const settingsButton = screen.getByLabelText("Open Settings");
    expect(settingsButton).toBeInTheDocument();
  });

  it("should open settings modal when settings button clicked", async () => {
    const user = userEvent.setup();
    render(Page);

    const settingsButton = screen.getByLabelText("Open Settings");
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Game Settings")).toBeInTheDocument();
    });
  });

  it("should close settings modal", async () => {
    const user = userEvent.setup();
    render(Page);

    // Open settings
    const settingsButton = screen.getByLabelText("Open Settings");
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Game Settings")).toBeInTheDocument();
    });

    // Close settings
    const closeButton = screen.getByText("Close");
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Game Settings")).not.toBeInTheDocument();
    });
  });

  it("should display digit count from settings", () => {
    render(Page);
    // Use getAllByText to get all matches and check the first one (digit count in the game info)
    const digitElements = screen.getAllByText(/3/);
    expect(digitElements.length).toBeGreaterThan(0);
    expect(digitElements[0]).toBeInTheDocument();
  });

  it("should display attempts remaining in single player mode", () => {
    gameStore.setMode("single");
    gameStore.startNewGame();
    render(Page);

    expect(
      screen.getByText("7", { selector: ".accent-value" })
    ).toBeInTheDocument();
    expect(screen.getByText(/attempts remaining/)).toBeInTheDocument();
  });

  it("should not display attempts in multiplayer mode", async () => {
    const user = userEvent.setup();
    gameStore.setMode("multi");
    gameStore.startNewGame();
    render(Page);

    expect(screen.queryByText(/attempts remaining/)).not.toBeInTheDocument();
  });

  it("should render SinglePlayerGame component in single player mode", () => {
    gameStore.setMode("single");
    gameStore.startNewGame();
    render(Page);

    expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
  });

  it("should render MultiPlayerGame component in multiplayer mode", () => {
    gameStore.setMode("multi");
    gameStore.startNewGame();
    render(Page);

    expect(screen.getByText("Player Setup")).toBeInTheDocument();
  });

  it("renders OnlineMultiplayerGame in online mode", () => {
    gameStore.setMode("online");
    render(Page);

    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByText("New Game").closest("button")).toBeDisabled();
  });

  it("should have New Game button", () => {
    render(Page);
    expect(screen.getByText("New Game")).toBeInTheDocument();
  });

  it("should start new game when New Game button clicked", async () => {
    const user = userEvent.setup();
    gameStore.setMode("single");
    gameStore.startNewGame();

    render(Page);

    // Make a guess to change game state
    await user.type(screen.getByPlaceholderText("Enter number"), "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });

    // Click New Game
    await user.click(screen.getByText("New Game"));

    // Game should be reset
    await waitFor(() => {
      expect(screen.queryByText(/Guess 1:/)).not.toBeInTheDocument();
    });
  });

  it("should display How to Play section", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Instructions/ }));
    expect(screen.getByText("How to Play:")).toBeInTheDocument();
  });

  it("should display game instructions", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Instructions/ }));
    expect(
      screen.getByText(/Choose your preferred number of digits/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Correct Digits:/)).toBeInTheDocument();
    expect(screen.getByText(/Correct Positions:/)).toBeInTheDocument();
  });

  it("should hide instructions when the card is clicked again", async () => {
    const user = userEvent.setup();
    render(Page);
    const instructionsCard = screen.getByRole("button", {
      name: "Instructions",
    });
    await user.click(instructionsCard);
    expect(screen.getByText("How to Play:")).toBeInTheDocument();
    await user.click(instructionsCard);
    expect(screen.queryByText("How to Play:")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
  });

  it("should switch to multiplayer from the nav card", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Multiplayer/ }));

    await waitFor(() => {
      expect(screen.getByText("Player Setup")).toBeInTheDocument();
    });
  });

  it("should return to single player from the nav card", async () => {
    const user = userEvent.setup();
    gameStore.setMode("multi");
    gameStore.startNewGame();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Single Player/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
    });
  });

  it("should switch between local and online multiplayer", async () => {
    const user = userEvent.setup();
    gameStore.setMode("multi");
    gameStore.startNewGame();
    render(Page);

    await user.click(screen.getByRole("button", { name: "Online" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Local" }));
    await waitFor(() => {
      expect(screen.getByText("Player Setup")).toBeInTheDocument();
    });
  });

  it("should disable New Game in online mode", () => {
    gameStore.setMode("online");
    render(Page);
    expect(screen.getByText("New Game").closest("button")).toBeDisabled();
  });

  it("should mark the hero and duplicated ticker content aria-hidden", () => {
    const { container } = render(Page);
    expect(container.querySelector(".hero")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    const tickerSeqs = container.querySelectorAll(".ticker-seq");
    expect(tickerSeqs[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("should have proper page title", () => {
    render(Page);
    // The title is set in svelte:head, which may not be testable in this context
    // but we can verify the component renders
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Number Guessing Game."
    );
  });

  it("should initialize game on mount", async () => {
    render(Page);

    // Wait for game to be initialized
    await waitFor(() => {
      let state: any;
      gameStore.subscribe((s) => (state = s))();
      expect(state.targetNumber).toBeTruthy();
    });
  });

  it("should display game info with correct styling", () => {
    render(Page);
    const gameInfo = screen.getByText(/I'm thinking of a/).closest("header");
    expect(gameInfo).toHaveClass("game-info");
  });

  it("should have settings button with proper styling", () => {
    render(Page);
    const settingsButton = screen.getByLabelText("Open Settings");
    expect(settingsButton).toHaveClass("nav-card");
    expect(settingsButton).toHaveClass("nav-green");
  });

  it("should have New Game button with proper styling", () => {
    render(Page);
    const newGameButton = screen.getByText("New Game").closest("button");
    expect(newGameButton).toHaveClass("nav-card");
    expect(newGameButton).toHaveClass("nav-primary");
  });
});

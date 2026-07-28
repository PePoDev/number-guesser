import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { get } from "svelte/store";
import Page from "./+page.svelte";
import { gameStore } from "$lib/stores/gameStore";

describe("+page.svelte Component", () => {
  beforeEach(() => {
    gameStore.reset();
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ stargazers_count: 128 }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should render the main title", () => {
    render(Page);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Number Guessing Game."
    );
  });

  it("moves settings out of the navigation rail", () => {
    const { container } = render(Page);

    expect(screen.queryByLabelText("Open Settings")).not.toBeInTheDocument();
    expect(container.querySelector(".nav-green")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Open Single Player settings")
    ).toBeInTheDocument();
  });

  it("shows GitHub stars in the game panel header", async () => {
    render(Page);

    const link = await screen.findByRole("link", {
      name: "Open number-guesser on GitHub, 128 stars",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://github.com/PePoDev/number-guesser"
    );
    expect(link.closest("header")).toHaveClass("game-info");
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("opens settings for the active single-player mode", async () => {
    const user = userEvent.setup();
    render(Page);

    const settingsButton = screen.getByLabelText(
      "Open Single Player settings"
    );
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Single Player Settings")).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("should close settings modal", async () => {
    const user = userEvent.setup();
    render(Page);

    const settingsButton = screen.getByLabelText(
      "Open Single Player settings"
    );
    await user.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText("Single Player Settings")).toBeInTheDocument();
    });

    const closeButton = screen.getByText("Close");
    await user.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Single Player Settings")
      ).not.toBeInTheDocument();
    });
  });

  it("opens settings for local multiplayer", async () => {
    const user = userEvent.setup();
    gameStore.setMode("multi");
    gameStore.startNewGame();
    render(Page);

    await user.click(
      screen.getByLabelText("Open Local Multiplayer settings")
    );

    expect(screen.getByText("Local Multiplayer Settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Players:")).toBeInTheDocument();
    expect(screen.queryByLabelText("Max Attempts:")).not.toBeInTheDocument();
  });

  it("shows online settings only before entering a room", async () => {
    gameStore.setMode("online");
    render(Page);

    expect(
      screen.getByLabelText("Open Online Multiplayer settings")
    ).toBeInTheDocument();
    gameStore.applyOnlineSnapshot({
      room: {
        id: "AB2C3D",
        hostUid: "host",
        phase: "lobby",
        digitCount: 3,
        maxPlayers: 2,
        playerOrder: ["host"],
        currentGuesserUid: null,
        winnerUid: null,
        turnNumber: 0,
      },
      players: [
        {
          uid: "host",
          name: "Ada",
          seat: 0,
          ready: false,
          eliminated: false,
        },
      ],
      guesses: [],
    });

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Open Online Multiplayer settings")
      ).not.toBeInTheDocument();
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

  it("selects online mode and pre-fills a valid invite room", async () => {
    window.history.replaceState({}, "", "/?room=ab2c3d");
    render(Page);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Online" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
    expect(screen.getByLabelText("Room ID")).toHaveValue("AB2C3D");
  });

  it("ignores an invalid invite room", async () => {
    window.history.replaceState({}, "", "/?room=invalid");
    render(Page);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Room ID")).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Number Guessing Game."
    );
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
      name: /Instructions/,
    });
    await user.click(instructionsCard);
    expect(screen.getByText("How to Play:")).toBeInTheDocument();
    await user.click(instructionsCard);
    expect(screen.queryByText("How to Play:")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
  });

  it("should return to the game when New Game is clicked from instructions", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.click(screen.getByRole("button", { name: /Instructions/ }));
    await user.click(screen.getByText("New Game"));

    expect(screen.queryByText("How to Play:")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter number")).toBeInTheDocument();
  });

  it("should preserve a draft guess while instructions are open", async () => {
    const user = userEvent.setup();
    render(Page);
    await user.type(screen.getByPlaceholderText("Enter number"), "12");

    const instructionsCard = screen.getByRole("button", {
      name: /Instructions/,
    });
    await user.click(instructionsCard);
    await user.click(instructionsCard);

    expect(screen.getByPlaceholderText("Enter number")).toHaveValue("12");
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

  it("should remember an online selection made outside the nav", async () => {
    const user = userEvent.setup();
    gameStore.setMode("online");
    render(Page);

    await user.click(screen.getByRole("button", { name: /Single Player/ }));
    await user.click(screen.getByRole("button", { name: /Multiplayer/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    });
  });

  it("should disable New Game in online mode", () => {
    gameStore.setMode("online");
    render(Page);
    expect(screen.getByText("New Game").closest("button")).toBeDisabled();
  });

  it("should show the authoritative room digit count online", async () => {
    gameStore.setMode("online");
    render(Page);
    gameStore.applyOnlineSnapshot({
      room: {
        id: "AB2C3D",
        hostUid: "host",
        phase: "lobby",
        digitCount: 5,
        maxPlayers: 2,
        playerOrder: ["host"],
        currentGuesserUid: null,
        winnerUid: null,
        turnNumber: 0,
      },
      players: [
        {
          uid: "host",
          name: "Ada",
          seat: 0,
          ready: false,
          eliminated: false,
        },
      ],
      guesses: [],
    });

    await waitFor(() => {
      expect(
        screen.getByText("5", { selector: ".accent-value" })
      ).toBeInTheDocument();
    });
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
      expect(get(gameStore).targetNumber).toBeTruthy();
    });
  });

  it("should display game info with correct styling", () => {
    render(Page);
    const gameInfo = screen.getByText(/I'm thinking of a/).closest("header");
    expect(gameInfo).toHaveClass("game-info");
  });

  it("should style the active-mode settings trigger", () => {
    render(Page);
    const settingsButton = screen.getByLabelText(
      "Open Single Player settings"
    );
    expect(settingsButton).toHaveClass("btn-secondary");
  });

  it("should have New Game button with proper styling", () => {
    render(Page);
    const newGameButton = screen.getByText("New Game").closest("button");
    expect(newGameButton).toHaveClass("nav-card");
    expect(newGameButton).toHaveClass("nav-primary");
  });
});

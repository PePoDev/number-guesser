import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";
import {
  gameStore,
  validateGuess,
  calculateFeedback,
  sanitizeDigits,
  type GameState,
} from "./gameStore";

describe("Game Store", () => {
  beforeEach(() => {
    gameStore.reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = get(gameStore);
      expect(state.locale).toBe("en");
      expect(state.mode).toBe("single");
      expect(state.settings.digitCount).toBe(3);
      expect(state.settings.maxAttempts).toBe(7);
      expect(state.settings.playerCount).toBe(2);
      expect(state.gameOver).toBe(false);
      expect(state.guessHistory).toEqual([]);
      expect(state.players).toEqual([]);
    });
  });

  describe("Locale", () => {
    it("switches the interface language", () => {
      gameStore.setLocale("th");
      expect(get(gameStore).locale).toBe("th");
    });

    it("keeps the language when a new game starts", () => {
      gameStore.setLocale("th");
      gameStore.setMode("multi");
      gameStore.startNewGame();
      expect(get(gameStore).locale).toBe("th");
    });
  });

  describe("Mode Management", () => {
    it("should switch to multiplayer mode", () => {
      gameStore.setMode("multi");
      const state = get(gameStore);
      expect(state.mode).toBe("multi");
    });

    it("should switch back to single player mode", () => {
      gameStore.setMode("multi");
      gameStore.setMode("single");
      const state = get(gameStore);
      expect(state.mode).toBe("single");
    });

    it("initializes online mode without local multiplayer players", () => {
      gameStore.setMode("online");
      gameStore.startNewGame();

      const state = get(gameStore);

      expect(state.mode).toBe("online");
      expect(state.players).toEqual([]);
      expect(state.online.status).toBe("idle");
    });

    it("applies online identity and snapshots through store actions", () => {
      gameStore.setOnlineIdentity("uid-1", "AB2C3D");
      gameStore.applyOnlineSnapshot({
        room: {
          id: "AB2C3D",
          hostUid: "uid-1",
          phase: "lobby",
          digitCount: 3,
          maxPlayers: 2,
          playerOrder: ["uid-1"],
          currentGuesserUid: null,
          winnerUid: null,
          turnNumber: 0,
        },
        players: [
          {
            uid: "uid-1",
            name: "Ada",
            seat: 0,
            ready: false,
            eliminated: false,
          },
        ],
        guesses: [],
      });

      const state = get(gameStore);

      expect(state.online.status).toBe("connected");
      expect(state.online.roomId).toBe("AB2C3D");
      expect(state.online.players[0].name).toBe("Ada");
    });
  });

  describe("Settings Management", () => {
    it("should update digit count", () => {
      gameStore.updateSettings({ digitCount: 4 });
      const state = get(gameStore);
      expect(state.settings.digitCount).toBe(4);
    });

    it("should update max attempts", () => {
      gameStore.updateSettings({ maxAttempts: 10 });
      const state = get(gameStore);
      expect(state.settings.maxAttempts).toBe(10);
    });

    it("should update player count", () => {
      gameStore.updateSettings({ playerCount: 3 });
      const state = get(gameStore);
      expect(state.settings.playerCount).toBe(3);
    });

    it("should update multiple settings at once", () => {
      gameStore.updateSettings({
        digitCount: 5,
        maxAttempts: 15,
        playerCount: 4,
      });
      const state = get(gameStore);
      expect(state.settings.digitCount).toBe(5);
      expect(state.settings.maxAttempts).toBe(15);
      expect(state.settings.playerCount).toBe(4);
    });
  });

  describe("Single Player Game", () => {
    beforeEach(() => {
      gameStore.setMode("single");
      gameStore.startNewGame();
    });

    it("should generate a target number with correct digit count", () => {
      const state = get(gameStore);
      expect(state.targetNumber).toHaveLength(3);
      expect(state.targetNumber).toMatch(/^\d{3}$/);
    });

    it("should initialize attempts correctly", () => {
      const state = get(gameStore);
      expect(state.attemptsLeft).toBe(7);
    });

    it("should add guess to history", () => {
      gameStore.addGuess({
        guess: "123",
        correctDigits: 2,
        correctPositions: 1,
      });
      const state = get(gameStore);
      expect(state.guessHistory).toHaveLength(1);
      expect(state.guessHistory[0].guess).toBe("123");
      expect(state.attemptsLeft).toBe(6);
    });

    it("should decrement attempts after each guess", () => {
      gameStore.addGuess({
        guess: "123",
        correctDigits: 1,
        correctPositions: 0,
      });
      gameStore.addGuess({
        guess: "456",
        correctDigits: 2,
        correctPositions: 1,
      });
      const state = get(gameStore);
      expect(state.attemptsLeft).toBe(5);
      expect(state.guessHistory).toHaveLength(2);
    });

    it("should set game over", () => {
      gameStore.setGameOver(true);
      const state = get(gameStore);
      expect(state.gameOver).toBe(true);
    });

    it("should reset game state", () => {
      gameStore.addGuess({
        guess: "123",
        correctDigits: 1,
        correctPositions: 0,
      });
      gameStore.setGameOver(true);
      gameStore.reset();
      const state = get(gameStore);
      expect(state.guessHistory).toEqual([]);
      expect(state.gameOver).toBe(false);
      expect(state.attemptsLeft).toBe(7);
    });
  });

  describe("Multiplayer Game", () => {
    beforeEach(() => {
      gameStore.setMode("multi");
      gameStore.updateSettings({ playerCount: 3 });
      gameStore.startNewGame();
    });

    it("should initialize players correctly", () => {
      const state = get(gameStore);
      expect(state.players).toHaveLength(3);
      expect(state.players[0].name).toBe("");
      expect(state.players[0].eliminated).toBe(false);
      expect(state.gamePhase).toBe("setup");
    });

    it("should save player setup", () => {
      gameStore.savePlayerSetup("Alice", "123");
      const state = get(gameStore);
      expect(state.players[0].name).toBe("Alice");
      expect(state.players[0].number).toBe("123");
      expect(state.currentSetupPlayer).toBe(1);
    });

    it("should transition to guessing phase after all players setup", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");
      const state = get(gameStore);
      expect(state.gamePhase).toBe("guessing");
    });

    it("should add multiplayer guess", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 1,
        guess: "456",
        correct: true,
        correctDigits: 3,
        correctPositions: 3,
      });

      const state = get(gameStore);
      expect(state.players[1].guesses).toHaveLength(1);
      expect(state.players[1].eliminated).toBe(true);
    });

    it("should remove eliminated player from active players", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 1,
        guess: "456",
        correct: true,
        correctDigits: 3,
        correctPositions: 3,
      });

      const state = get(gameStore);
      expect(state.activePlayers).toHaveLength(2);
      expect(state.activePlayers).not.toContain(1);
    });

    it("should end game when only one player remains", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      // Eliminate Bob
      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 1,
        guess: "456",
        correct: true,
        correctDigits: 3,
        correctPositions: 3,
      });

      // Eliminate Charlie
      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 2,
        guess: "789",
        correct: true,
        correctDigits: 3,
        correctPositions: 3,
      });

      const state = get(gameStore);
      expect(state.gamePhase).toBe("finished");
      expect(state.gameOver).toBe(true);
      expect(state.activePlayers).toHaveLength(1);
    });

    it("should move to next guesser", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      expect(get(gameStore).currentGuesser).toBe(0);
      gameStore.nextGuesser();
      expect(get(gameStore).currentGuesser).toBe(1);
      gameStore.nextGuesser();
      expect(get(gameStore).currentGuesser).toBe(2);
      gameStore.nextGuesser();
      expect(get(gameStore).currentGuesser).toBe(0);
    });

    it("should skip eliminated players when moving to next guesser", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      // Eliminate player 1
      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 1,
        guess: "456",
        correct: true,
        correctDigits: 3,
        correctPositions: 3,
      });

      gameStore.nextGuesser();
      const state = get(gameStore);
      expect(state.currentGuesser).toBe(2); // Should skip player 1
    });

    it("should add incorrect guess without eliminating player", () => {
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");
      gameStore.savePlayerSetup("Charlie", "789");

      gameStore.addMultiPlayerGuess({
        guesser: 0,
        target: 1,
        guess: "111",
        correct: false,
        correctDigits: 1,
        correctPositions: 0,
      });

      const state = get(gameStore);
      expect(state.players[1].guesses).toHaveLength(1);
      expect(state.players[1].eliminated).toBe(false);
      expect(state.activePlayers).toHaveLength(3);
      expect(state.gamePhase).toBe("guessing");
    });
  });
});

describe("validateGuess", () => {
  it("should validate correct guess", () => {
    const result = validateGuess("123", 3);
    expect(result.valid).toBe(true);
    expect(result.problem).toBeNull();
  });

  it("should reject non-numeric input", () => {
    const result = validateGuess("abc", 3);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("invalid");
  });

  it("should reject incorrect length", () => {
    const result = validateGuess("12", 3);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("length");
  });

  it("should reject negative numbers", () => {
    const result = validateGuess("-123", 3);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("invalid");
  });

  it("should accept numbers with leading zeros", () => {
    const result = validateGuess("012", 3);
    expect(result.valid).toBe(true);
  });

  it("should validate different digit counts", () => {
    expect(validateGuess("12", 2).valid).toBe(true);
    expect(validateGuess("1234", 4).valid).toBe(true);
    expect(validateGuess("12345", 5).valid).toBe(true);
  });

  it("should reject numbers exceeding max value", () => {
    const result = validateGuess("1000", 3);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("range");
  });

  it("should reject negative numbers with proper range message", () => {
    const result = validateGuess("-1", 2);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("invalid");
  });

  it("should show proper range for 2 digits", () => {
    const result = validateGuess("100", 2);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("range");
  });

  it("should show proper range for 4 digits", () => {
    const result = validateGuess("10000", 4);
    expect(result.valid).toBe(false);
    expect(result.problem).toBe("range");
  });
});

describe("calculateFeedback", () => {
  it("should calculate perfect match", () => {
    const result = calculateFeedback("123", "123");
    expect(result.correctDigits).toBe(3);
    expect(result.correctPositions).toBe(3);
  });

  it("should calculate no match", () => {
    const result = calculateFeedback("123", "456");
    expect(result.correctDigits).toBe(0);
    expect(result.correctPositions).toBe(0);
  });

  it("should calculate correct digits but wrong positions", () => {
    const result = calculateFeedback("123", "321");
    expect(result.correctDigits).toBe(3);
    expect(result.correctPositions).toBe(1);
  });

  it("should calculate partial match", () => {
    const result = calculateFeedback("401", "410");
    expect(result.correctDigits).toBe(3);
    expect(result.correctPositions).toBe(1);
  });

  it("should handle duplicate digits correctly", () => {
    const result = calculateFeedback("111", "112");
    expect(result.correctDigits).toBe(2);
    expect(result.correctPositions).toBe(2);
  });

  it("should handle all same digits", () => {
    const result = calculateFeedback("111", "111");
    expect(result.correctDigits).toBe(3);
    expect(result.correctPositions).toBe(3);
  });

  it("should handle complex duplicate scenarios", () => {
    const result = calculateFeedback("1223", "2213");
    expect(result.correctDigits).toBe(4);
    expect(result.correctPositions).toBe(2);
  });

  it("should work with 2-digit numbers", () => {
    const result = calculateFeedback("12", "21");
    expect(result.correctDigits).toBe(2);
    expect(result.correctPositions).toBe(0);
  });

  it("should work with 5-digit numbers", () => {
    const result = calculateFeedback("12345", "54321");
    expect(result.correctDigits).toBe(5);
    expect(result.correctPositions).toBe(1);
  });

  it("should handle leading zeros", () => {
    const result = calculateFeedback("012", "021");
    expect(result.correctDigits).toBe(3);
    expect(result.correctPositions).toBe(1);
  });
});

describe('sanitizeDigits', () => {
  it('removes non-digit characters', () => {
    expect(sanitizeDigits('a1-2.3b', 5)).toBe('123')
  })

  it('limits the result without removing leading zeroes', () => {
    expect(sanitizeDigits('001234', 4)).toBe('0012')
  })

  it('handles a pasted mixed value', () => {
    expect(sanitizeDigits(' 0a9\n8 ', 3)).toBe('098')
  })
})

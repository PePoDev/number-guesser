import { writable, derived } from "svelte/store";

export type GameMode = "single" | "multi";
export type GamePhase = "setup" | "guessing" | "finished";

export interface Player {
  id: number;
  name: string;
  number: string;
  guesses: GuessEntry[];
  eliminated: boolean;
}

export interface GuessEntry {
  guesser: number;
  target: number;
  guess: string;
  correct: boolean;
  correctDigits: number;
  correctPositions: number;
}

export interface SinglePlayerGuess {
  guess: string;
  correctDigits: number;
  correctPositions: number;
}

export interface GameSettings {
  digitCount: number;
  maxAttempts: number;
  playerCount: number;
}

export interface GameState {
  mode: GameMode;
  settings: GameSettings;
  targetNumber: string;
  attemptsLeft: number;
  gameOver: boolean;
  guessHistory: SinglePlayerGuess[];
  players: Player[];
  currentSetupPlayer: number;
  currentGuesser: number;
  gamePhase: GamePhase;
  activePlayers: number[];
}

const initialSettings: GameSettings = {
  digitCount: 3,
  maxAttempts: 7,
  playerCount: 2,
};

const initialState: GameState = {
  mode: "single",
  settings: initialSettings,
  targetNumber: "",
  attemptsLeft: 7,
  gameOver: false,
  guessHistory: [],
  players: [],
  currentSetupPlayer: 0,
  currentGuesser: 0,
  gamePhase: "setup",
  activePlayers: [],
};

function createGameStore() {
  const { subscribe, set, update } = writable<GameState>(initialState);

  return {
    subscribe,
    setMode: (mode: GameMode) => update((state) => ({ ...state, mode })),
    updateSettings: (settings: Partial<GameSettings>) =>
      update((state) => ({
        ...state,
        settings: { ...state.settings, ...settings },
      })),
    startNewGame: () =>
      update((state) => {
        if (state.mode === "single") {
          return {
            ...state,
            targetNumber: generateRandomNumber(state.settings.digitCount),
            attemptsLeft: state.settings.maxAttempts,
            gameOver: false,
            guessHistory: [],
          };
        } else {
          // Initialize multiplayer
          const players: Player[] = [];
          for (let i = 0; i < state.settings.playerCount; i++) {
            players.push({
              id: i,
              name: `Player ${i + 1}`,
              number: "",
              guesses: [],
              eliminated: false,
            });
          }
          return {
            ...state,
            players,
            currentSetupPlayer: 0,
            currentGuesser: 0,
            gamePhase: "setup",
            activePlayers: Array.from(
              { length: state.settings.playerCount },
              (_, i) => i
            ),
            gameOver: false,
          };
        }
      }),
    addGuess: (guess: SinglePlayerGuess) =>
      update((state) => ({
        ...state,
        guessHistory: [...state.guessHistory, guess],
        attemptsLeft: state.attemptsLeft - 1,
      })),
    setGameOver: (isOver: boolean) =>
      update((state) => ({ ...state, gameOver: isOver })),
    savePlayerSetup: (name: string, number: string) =>
      update((state) => {
        const newPlayers = [...state.players];
        newPlayers[state.currentSetupPlayer] = {
          ...newPlayers[state.currentSetupPlayer],
          name,
          number,
        };
        const nextPlayer = state.currentSetupPlayer + 1;
        return {
          ...state,
          players: newPlayers,
          currentSetupPlayer: nextPlayer,
          gamePhase:
            nextPlayer >= state.settings.playerCount ? "guessing" : "setup",
        };
      }),
    addMultiPlayerGuess: (guessEntry: GuessEntry) =>
      update((state) => {
        const newPlayers = [...state.players];
        newPlayers[guessEntry.target].guesses.push(guessEntry);

        if (guessEntry.correct) {
          newPlayers[guessEntry.target].eliminated = true;
          const newActivePlayers = state.activePlayers.filter(
            (p) => p !== guessEntry.target
          );

          if (newActivePlayers.length === 1) {
            return {
              ...state,
              players: newPlayers,
              activePlayers: newActivePlayers,
              gamePhase: "finished",
              gameOver: true,
            };
          }

          return {
            ...state,
            players: newPlayers,
            activePlayers: newActivePlayers,
          };
        }

        return {
          ...state,
          players: newPlayers,
        };
      }),
    nextGuesser: () =>
      update((state) => {
        let next = (state.currentGuesser + 1) % state.settings.playerCount;
        while (state.players[next].eliminated) {
          next = (next + 1) % state.settings.playerCount;
        }
        return {
          ...state,
          currentGuesser: next,
        };
      }),
    reset: () => set(initialState),
  };
}

export const gameStore = createGameStore();

// Helper function to generate random number
function generateRandomNumber(digitCount: number): string {
  const max = Math.pow(10, digitCount) - 1;
  const randomNum = Math.floor(Math.random() * (max + 1));
  return randomNum.toString().padStart(digitCount, "0");
}

// Helper functions for game logic
export function validateGuess(
  guess: string,
  digitCount: number
): { valid: boolean; message: string } {
  // Check for negative numbers first
  if (guess.includes("-")) {
    return { valid: false, message: "Please enter a valid number." };
  }

  if (isNaN(Number(guess))) {
    return { valid: false, message: "Please enter a valid number." };
  }

  // Check range before length to provide better error messages
  const num = parseInt(guess);
  const max = Math.pow(10, digitCount) - 1;

  if (num < 0 || num > max) {
    const minDisplay = "0".repeat(digitCount);
    const maxDisplay = max.toString();
    return {
      valid: false,
      message: `Please enter a number between ${minDisplay} and ${maxDisplay}.`,
    };
  }

  if (guess.length !== digitCount) {
    return {
      valid: false,
      message: `Please enter exactly ${digitCount} digits.`,
    };
  }

  return { valid: true, message: "" };
}

export function calculateFeedback(
  guess: string,
  target: string
): { correctDigits: number; correctPositions: number } {
  const guessDigits = guess.split("");
  const targetDigits = target.split("");
  const digitCount = guess.length;

  let correctPositions = 0;
  let correctDigits = 0;

  // Count correct positions
  for (let i = 0; i < digitCount; i++) {
    if (guessDigits[i] === targetDigits[i]) {
      correctPositions++;
    }
  }

  // Count correct digits
  const targetDigitCount: Record<string, number> = {};
  const guessDigitCount: Record<string, number> = {};

  for (let i = 0; i < digitCount; i++) {
    targetDigitCount[targetDigits[i]] =
      (targetDigitCount[targetDigits[i]] || 0) + 1;
    guessDigitCount[guessDigits[i]] =
      (guessDigitCount[guessDigits[i]] || 0) + 1;
  }

  for (const digit in guessDigitCount) {
    if (targetDigitCount[digit]) {
      correctDigits += Math.min(
        guessDigitCount[digit],
        targetDigitCount[digit]
      );
    }
  }

  return { correctDigits, correctPositions };
}

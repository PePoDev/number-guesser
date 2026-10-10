import { writable } from "svelte/store";
import type {
  OnlineConnectionStatus,
  OnlineErrorCode,
  OnlineGameState,
  OnlineSnapshot,
} from "../online/types";
import type { Locale } from "../i18n/messages";

export type GameMode = "single" | "multi" | "online";
export type GamePhase = "setup" | "guessing" | "finished";
export type GuessProblem = "invalid" | "range" | "length";

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
  locale: Locale;
  mode: GameMode;
  round: number;
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
  online: OnlineGameState;
}

const initialSettings: GameSettings = {
  digitCount: 3,
  maxAttempts: 7,
  playerCount: 2,
};

const initialOnlineState: OnlineGameState = {
  status: "idle",
  uid: "",
  roomId: "",
  room: null,
  players: [],
  guesses: [],
  error: "",
};

const initialState: GameState = {
  locale: "en",
  mode: "single",
  round: 0,
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
  online: initialOnlineState,
};

function createGameStore() {
  const { subscribe, set, update } = writable<GameState>(initialState);

  return {
    subscribe,
    setLocale: (locale: Locale) => update((state) => ({ ...state, locale })),
    setMode: (mode: GameMode) => update((state) => ({ ...state, mode })),
    updateSettings: (settings: Partial<GameSettings>) =>
      update((state) => ({
        ...state,
        settings: { ...state.settings, ...settings },
      })),
    setOnlineStatus: (
      status: OnlineConnectionStatus,
      error: OnlineErrorCode | "" = ""
    ) =>
      update((state) => ({
        ...state,
        online: { ...state.online, status, error },
      })),
    setOnlineIdentity: (uid: string, roomId: string) =>
      update((state) => ({
        ...state,
        online: {
          ...state.online,
          uid,
          roomId,
          status: "connecting",
          error: "",
        },
      })),
    applyOnlineSnapshot: (snapshot: OnlineSnapshot) =>
      update((state) => ({
        ...state,
        online: {
          ...state.online,
          status: "connected",
          roomId: snapshot.room.id,
          room: snapshot.room,
          players: snapshot.players,
          guesses: snapshot.guesses,
          error: "",
        },
      })),
    clearOnlineSession: () =>
      update((state) => ({
        ...state,
        online: initialOnlineState,
      })),
    startNewGame: () =>
      update((state) => {
        if (state.mode === "single") {
          return {
            ...state,
            round: state.round + 1,
            targetNumber: generateRandomNumber(state.settings.digitCount),
            attemptsLeft: state.settings.maxAttempts,
            gameOver: false,
            guessHistory: [],
          };
        } else if (state.mode === "multi") {
          const players: Player[] = [];
          for (let i = 0; i < state.settings.playerCount; i++) {
            players.push({
              id: i,
              name: state.players[i]?.name ?? "",
              number: "",
              guesses: [],
              eliminated: false,
            });
          }
          return {
            ...state,
            round: state.round + 1,
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
        return state;
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

// Thai keyboards type Thai numerals (๐–๙); they mean the same digits.
export function sanitizeDigits(value: string, maxLength: number): string {
  return value
    .replace(/[\u0E50-\u0E59]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0e50),
    )
    .replace(/\D/g, '')
    .slice(0, maxLength)
}

// Rewrites the field itself so stripped characters never show.
export function keepDigits(event: Event, maxLength: number): string {
  const input = event.currentTarget as HTMLInputElement
  input.value = sanitizeDigits(input.value, maxLength)
  return input.value
}

function generateRandomNumber(digitCount: number): string {
  return Math.floor(Math.random() * 10 ** digitCount)
    .toString()
    .padStart(digitCount, "0");
}

export function validateGuess(
  guess: string,
  digitCount: number
): { valid: true; problem: null } | { valid: false; problem: GuessProblem } {
  if (guess.includes("-") || isNaN(Number(guess))) {
    return { valid: false, problem: "invalid" };
  }
  if (parseInt(guess) >= 10 ** digitCount) {
    return { valid: false, problem: "range" };
  }
  if (guess.length !== digitCount) {
    return { valid: false, problem: "length" };
  }
  return { valid: true, problem: null };
}

// Each guessed digit can match at most one unused digit of the target.
export function calculateFeedback(
  guess: string,
  target: string
): { correctDigits: number; correctPositions: number } {
  const unmatched = [...target];
  let correctDigits = 0;
  let correctPositions = 0;
  [...guess].forEach((digit, index) => {
    if (digit === target[index]) {
      correctPositions++;
    }
    const match = unmatched.indexOf(digit);
    if (match !== -1) {
      unmatched.splice(match, 1);
      correctDigits++;
    }
  });
  return { correctDigits, correctPositions };
}

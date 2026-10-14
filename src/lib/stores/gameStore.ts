import { writable } from "svelte/store";
import type {
  OnlineConnectionStatus,
  OnlineErrorCode,
  OnlineGameState,
  OnlineSnapshot,
} from "../online/types";
import type { Locale } from "../i18n/messages";

export type GameMode = "daily" | "single" | "multi" | "online";
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

export type TileState = 'correct' | 'present' | 'absent'

export type DailyStatus = 'playing' | 'won' | 'lost'

export interface DailyStats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  distribution: number[]
  lastPlayedDay: number
  lastWonDay: number
}

export interface DailyProgress {
  day: number
  guesses: string[]
  stats: DailyStats
}

export const DAILY_DIGITS = 5
export const DAILY_TRIES = 6

export const EMPTY_DAILY_STATS: DailyStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array.from({ length: DAILY_TRIES }, () => 0),
  lastPlayedDay: 0,
  lastWonDay: 0,
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
  daily: DailyProgress;
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
  mode: "daily",
  round: 0,
  settings: initialSettings,
  targetNumber: "",
  attemptsLeft: 7,
  gameOver: false,
  guessHistory: [],
  daily: { day: 0, guesses: [], stats: EMPTY_DAILY_STATS },
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
    loadDaily: (daily: DailyProgress) => update((state) => ({ ...state, daily })),
    addDailyGuess: (guess: string) =>
      update((state) => {
        const { day, guesses, stats } = state.daily
        const target = dailyTarget(day)
        if (dailyStatus(guesses, target) !== 'playing') {
          return state
        }
        const next = [...guesses, guess]
        const status = dailyStatus(next, target)
        return {
          ...state,
          daily: {
            day,
            guesses: next,
            stats:
              status === 'playing'
                ? stats
                : recordDailyResult(stats, day, status === 'won', next.length),
          },
        }
      }),
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

const DAILY_EPOCH = Date.UTC(2026, 9, 14)
const DAY_MS = 86_400_000

// Puzzles follow the player's own calendar date, as Wordle does. Comparing UTC
// midnights of local dates keeps every day exactly one step, even across DST.
export function dailyNumber(date: Date): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.max(1, (today - DAILY_EPOCH) / DAY_MS + 1)
}

export function msUntilDaily(day: number, now: Date): number {
  return new Date(2026, 9, 13 + day).getTime() - now.getTime()
}

export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return [seconds / 3600, (seconds % 3600) / 60, seconds % 60]
    .map((part) => String(Math.floor(part)).padStart(2, '0'))
    .join(':')
}

// Published answers must never change: every shared result and saved game
// depends on this exact mixing of the puzzle number.
export function dailyTarget(day: number): string {
  let x = (day + 0x4e47) >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return String((x >>> 0) % 10 ** DAILY_DIGITS).padStart(DAILY_DIGITS, '0')
}

// A digit is "present" only while the target still has an unmatched copy,
// so extra copies of a digit stay "absent", as in Wordle.
export function scoreTiles(guess: string, target: string): TileState[] {
  const unmatched = [...target].filter((digit, index) => guess[index] !== digit)
  return [...guess].map((digit, index) => {
    if (digit === target[index]) {
      return 'correct'
    }
    const match = unmatched.indexOf(digit)
    if (match === -1) {
      return 'absent'
    }
    unmatched.splice(match, 1)
    return 'present'
  })
}

const tileRank: Record<TileState, number> = { absent: 0, present: 1, correct: 2 }

export function digitStates(
  guesses: string[],
  target: string,
): Partial<Record<string, TileState>> {
  const states: Partial<Record<string, TileState>> = {}
  for (const guess of guesses) {
    scoreTiles(guess, target).forEach((state, index) => {
      const known = states[guess[index]]
      if (!known || tileRank[state] > tileRank[known]) {
        states[guess[index]] = state
      }
    })
  }
  return states
}

export function dailyStatus(guesses: string[], target: string): DailyStatus {
  if (guesses.includes(target)) {
    return 'won'
  }
  return guesses.length >= DAILY_TRIES ? 'lost' : 'playing'
}

export function recordDailyResult(
  stats: DailyStats,
  day: number,
  won: boolean,
  tries: number,
): DailyStats {
  if (stats.lastPlayedDay >= day) {
    return stats
  }
  const streak = won ? (stats.lastWonDay === day - 1 ? stats.currentStreak + 1 : 1) : 0
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak: streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    distribution: stats.distribution.map((count, index) =>
      won && index === tries - 1 ? count + 1 : count,
    ),
    lastPlayedDay: day,
    lastWonDay: won ? day : stats.lastWonDay,
  }
}

// A streak survives until a day is missed, so yesterday's win still counts.
export function liveStreak(stats: DailyStats, day: number): number {
  return stats.lastWonDay >= day - 1 ? stats.currentStreak : 0
}

const tileEmoji: Record<TileState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
}

export function shareGrid(guesses: string[], target: string): string {
  return guesses
    .map((guess) => scoreTiles(guess, target).map((state) => tileEmoji[state]).join(''))
    .join('\n')
}

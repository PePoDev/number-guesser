import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import {
  gameStore,
  validateGuess,
  calculateFeedback,
  sanitizeDigits,
  keepDigits,
  dailyNumber,
  dailyTarget,
  msUntilDaily,
  formatCountdown,
  scoreTiles,
  digitStates,
  dailyStatus,
  recordDailyResult,
  liveStreak,
  shareGrid,
  DAILY_DIGITS,
  DAILY_TRIES,
  EMPTY_DAILY_STATS,
} from "./gameStore";

describe("Game Store", () => {
  beforeEach(() => {
    gameStore.reset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = get(gameStore);
      expect(state.locale).toBe("en");
      expect(state.sound).toBe(true);
      expect(state.mode).toBe("daily");
      expect(state.settings.digitCount).toBe(3);
      expect(state.settings.maxAttempts).toBe(7);
      expect(state.settings.playerCount).toBe(2);
      expect(state.gameOver).toBe(false);
      expect(state.guessHistory).toEqual([]);
      expect(state.players).toEqual([]);
    });
  });

  describe("Rounds", () => {
    it("counts every new game", () => {
      gameStore.setMode("random");
      gameStore.startNewGame();
      gameStore.startNewGame();
      expect(get(gameStore).round).toBe(2);
    });

    it("keeps local player names for a rematch", () => {
      gameStore.setMode("multi");
      gameStore.startNewGame();
      gameStore.savePlayerSetup("Alice", "123");
      gameStore.savePlayerSetup("Bob", "456");

      gameStore.startNewGame();

      const state = get(gameStore);
      expect(state.players.map((player) => player.name)).toEqual(["Alice", "Bob"]);
      expect(state.players.every((player) => player.number === "")).toBe(true);
      expect(state.gamePhase).toBe("setup");
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

  describe("Sound", () => {
    it("turns win sounds off and back on", () => {
      gameStore.setSound(false);
      expect(get(gameStore).sound).toBe(false);

      gameStore.setSound(true);
      expect(get(gameStore).sound).toBe(true);
    });

    it("keeps the sound choice when a new game starts", () => {
      gameStore.setSound(false);
      gameStore.setMode("random");
      gameStore.startNewGame();
      expect(get(gameStore).sound).toBe(false);
    });
  });

  describe("Mode Management", () => {
    it("should switch to multiplayer mode", () => {
      gameStore.setMode("multi");
      const state = get(gameStore);
      expect(state.mode).toBe("multi");
    });

    it("should switch back to random mode", () => {
      gameStore.setMode("multi");
      gameStore.setMode("random");
      const state = get(gameStore);
      expect(state.mode).toBe("random");
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

  describe("Random Game", () => {
    beforeEach(() => {
      gameStore.setMode("random");
      gameStore.startNewGame();
    });

    it("should generate a three-digit target by default", () => {
      const state = get(gameStore);
      expect(state.targetNumber).toBe("500");
    });

    it("starts each new game fresh with the chosen digits and attempts", () => {
      gameStore.addRandomGuess("123");
      gameStore.updateSettings({ digitCount: 5, maxAttempts: 10 });

      gameStore.startNewGame();

      const state = get(gameStore);
      expect(state.targetNumber).toBe("50000");
      expect(state.attemptsLeft).toBe(10);
      expect(state.guessHistory).toEqual([]);
      expect(state.gameOver).toBe(false);
    });

    it("should initialize attempts correctly", () => {
      const state = get(gameStore);
      expect(state.attemptsLeft).toBe(7);
    });

    it("scores a guess against the target and uses one attempt", () => {
      gameStore.addRandomGuess("501");
      const state = get(gameStore);
      expect(state.guessHistory).toEqual([
        { guess: "501", correctDigits: 2, correctPositions: 2 },
      ]);
      expect(state.attemptsLeft).toBe(6);
      expect(state.gameOver).toBe(false);
    });

    it("ends the game when the number is guessed", () => {
      gameStore.addRandomGuess("123");
      gameStore.addRandomGuess("500");
      const state = get(gameStore);
      expect(state.gameOver).toBe(true);
      expect(state.attemptsLeft).toBe(5);
    });

    it("ends the game when the last attempt misses", () => {
      gameStore.updateSettings({ maxAttempts: 3 });
      gameStore.startNewGame();
      for (const guess of ["111", "222", "333"]) {
        gameStore.addRandomGuess(guess);
      }
      const state = get(gameStore);
      expect(state.gameOver).toBe(true);
      expect(state.attemptsLeft).toBe(0);
    });

    it("ignores guesses once the game is over", () => {
      gameStore.addRandomGuess("500");
      gameStore.addRandomGuess("123");
      const state = get(gameStore);
      expect(state.guessHistory).toHaveLength(1);
      expect(state.attemptsLeft).toBe(6);
    });

    it("should reset game state", () => {
      gameStore.addRandomGuess("500");
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

  it('reads Thai numerals as digits', () => {
    expect(sanitizeDigits('๑๒๓', 3)).toBe('123')
    expect(sanitizeDigits('๐9๕', 3)).toBe('095')
  })
})

describe('keepDigits', () => {
  it('filters the field it was typed into and returns the digits', () => {
    const input = document.createElement('input')
    input.value = '๑2a34'
    let kept = ''
    input.addEventListener('input', (event) => {
      kept = keepDigits(event, 3)
    })

    input.dispatchEvent(new Event('input'))

    expect(kept).toBe('123')
    expect(input.value).toBe('123')
  })
})

describe('dailyNumber', () => {
  it('starts at puzzle 1 on 2026-10-14 and counts local calendar days', () => {
    expect(dailyNumber(new Date(2026, 9, 14, 0, 0))).toBe(1)
    expect(dailyNumber(new Date(2026, 9, 14, 23, 59))).toBe(1)
    expect(dailyNumber(new Date(2026, 9, 15, 0, 0))).toBe(2)
    expect(dailyNumber(new Date(2027, 9, 14, 12))).toBe(366)
  })

  it('keeps one step per day across daylight-saving changes', () => {
    expect(dailyNumber(new Date(2027, 2, 29)) - dailyNumber(new Date(2027, 2, 27))).toBe(2)
    expect(dailyNumber(new Date(2027, 10, 8)) - dailyNumber(new Date(2027, 10, 6))).toBe(2)
  })

  it('never goes below puzzle 1 for a clock set before launch', () => {
    expect(dailyNumber(new Date(2026, 0, 1))).toBe(1)
  })
})

describe('msUntilDaily and formatCountdown', () => {
  it('counts down to the local midnight that starts a puzzle', () => {
    const now = new Date(2026, 9, 14, 21, 30, 15)
    expect(formatCountdown(msUntilDaily(2, now))).toBe('02:29:45')
    expect(msUntilDaily(1, now)).toBeLessThan(0)
  })

  it('rounds partial seconds up and stops at zero', () => {
    expect(formatCountdown(1)).toBe('00:00:01')
    expect(formatCountdown(-5000)).toBe('00:00:00')
  })
})

describe('dailyTarget', () => {
  it('is three digits in six tries', () => {
    expect(DAILY_DIGITS).toBe(3)
    expect(DAILY_TRIES).toBe(6)
  })

  it('never changes a published answer', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(dailyTarget)).toEqual([
      '273',
      '866',
      '054',
      '937',
      '185',
      '542',
      '885',
    ])
  })

  it('always returns three digits', () => {
    for (let day = 1; day <= 1000; day++) {
      expect(dailyTarget(day)).toMatch(/^\d{3}$/)
    }
  })
})

describe('scoreTiles', () => {
  it('marks right spots, wrong spots, and missing digits', () => {
    expect(scoreTiles('315', '635')).toEqual(['present', 'absent', 'correct'])
    expect(scoreTiles('321', '123')).toEqual(['present', 'correct', 'present'])
  })

  it('gives each copy of a digit in the target to one guessed digit, right spots first', () => {
    expect(scoreTiles('111', '101')).toEqual(['correct', 'absent', 'correct'])
    expect(scoreTiles('113', '214')).toEqual(['absent', 'correct', 'absent'])
    expect(scoreTiles('221', '112')).toEqual(['present', 'absent', 'present'])
  })
})

describe('digitStates', () => {
  it('keeps the best state each digit has earned', () => {
    const best = { 1: 'correct', 2: 'correct', 3: 'absent' }
    expect(digitStates(['123', '213'], '210')).toEqual(best)
    expect(digitStates(['213', '123'], '210')).toEqual(best)
    expect(digitStates([], '210')).toEqual({})
  })
})

describe('dailyStatus', () => {
  it('is won by the answer and lost after six misses', () => {
    expect(dailyStatus([], '123')).toBe('playing')
    expect(dailyStatus(['000', '123'], '123')).toBe('won')
    expect(dailyStatus(Array.from({ length: 5 }, (_, i) => `00${i}`), '123')).toBe('playing')
    expect(dailyStatus(Array.from({ length: 6 }, (_, i) => `00${i}`), '123')).toBe('lost')
  })
})

describe('recordDailyResult', () => {
  it('counts a win, its tries, and starts a streak', () => {
    const stats = recordDailyResult(EMPTY_DAILY_STATS, 4, true, 3)
    expect(stats).toEqual({
      played: 1,
      wins: 1,
      currentStreak: 1,
      maxStreak: 1,
      distribution: [0, 0, 1, 0, 0, 0],
      lastPlayedDay: 4,
      lastWonDay: 4,
    })
  })

  it('extends a streak only on consecutive days and keeps the best', () => {
    let stats = recordDailyResult(EMPTY_DAILY_STATS, 1, true, 2)
    stats = recordDailyResult(stats, 2, true, 4)
    expect(stats.currentStreak).toBe(2)
    stats = recordDailyResult(stats, 4, true, 1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.maxStreak).toBe(2)
    expect(stats.distribution).toEqual([1, 1, 0, 1, 0, 0])
  })

  it('ends the streak on a loss without counting a win', () => {
    let stats = recordDailyResult(EMPTY_DAILY_STATS, 1, true, 2)
    stats = recordDailyResult(stats, 2, false, 6)
    expect(stats).toMatchObject({ played: 2, wins: 1, currentStreak: 0, maxStreak: 1, lastWonDay: 1 })
  })

  it('records each puzzle once', () => {
    const stats = recordDailyResult(EMPTY_DAILY_STATS, 3, true, 2)
    expect(recordDailyResult(stats, 3, false, 6)).toBe(stats)
  })
})

describe('liveStreak', () => {
  it('shows the streak until a day is missed', () => {
    const stats = recordDailyResult(EMPTY_DAILY_STATS, 5, true, 2)
    expect(liveStreak(stats, 5)).toBe(1)
    expect(liveStreak(stats, 6)).toBe(1)
    expect(liveStreak(stats, 7)).toBe(0)
  })
})

describe('shareGrid', () => {
  it('shows colors only, one row per guess', () => {
    expect(shareGrid(['315', '635'], '635')).toBe('🟨⬜🟩\n🟩🟩🟩')
  })
})

describe('Guessle store actions', () => {
  beforeEach(() => {
    gameStore.reset()
  })

  it('loads progress and records the result when the puzzle ends', () => {
    gameStore.loadDaily({ day: 1, guesses: [], stats: EMPTY_DAILY_STATS })
    gameStore.addDailyGuess('123')
    expect(get(gameStore).daily.stats.played).toBe(0)

    gameStore.addDailyGuess(dailyTarget(1))
    const { daily } = get(gameStore)
    expect(daily.guesses).toEqual(['123', dailyTarget(1)])
    expect(daily.stats).toMatchObject({ played: 1, wins: 1, distribution: [0, 1, 0, 0, 0, 0] })
  })

  it('ignores guesses after the puzzle ends', () => {
    gameStore.loadDaily({ day: 1, guesses: [dailyTarget(1)], stats: EMPTY_DAILY_STATS })
    gameStore.addDailyGuess('123')
    expect(get(gameStore).daily.guesses).toEqual([dailyTarget(1)])
  })

  it('records a loss after the sixth miss', () => {
    gameStore.loadDaily({ day: 2, guesses: [], stats: EMPTY_DAILY_STATS })
    for (const guess of ['000', '111', '222', '333', '444', '555']) {
      gameStore.addDailyGuess(guess)
    }
    expect(get(gameStore).daily.stats).toMatchObject({ played: 1, wins: 0, currentStreak: 0 })
  })
})

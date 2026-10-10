import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("should give the guess input an accessible name", () => {
    render(SinglePlayerGame);

    expect(screen.getByRole("textbox", { name: "Guess" })).toBeInTheDocument();
  });

  it('keeps only digits in typed or pasted guesses', async () => {
    render(SinglePlayerGame)
    const input = screen.getByLabelText('Guess')

    await fireEvent.input(input, { target: { value: '0a1-2' } })

    expect(input).toHaveValue('012')
  })

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

  it("should treat filtered non-digit input as empty", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const input = screen.getByPlaceholderText("Enter number");

    await user.type(input, "abc");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a number before submitting/)
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

  it("should cap guesses at the configured digit count", async () => {
    render(SinglePlayerGame);
    const input = screen.getByPlaceholderText(
      "Enter number"
    ) as HTMLInputElement;

    await fireEvent.input(input, { target: { value: "1234" } });

    expect(input).toHaveValue("123");
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

    // Make first guess
    await user.type(screen.getByPlaceholderText("Enter number"), "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });

    // Get attempts after first guess from store
    let attemptsAfterFirst = 0;
    gameStore.subscribe((state) => {
      attemptsAfterFirst = state.attemptsLeft;
    })();

    // Try duplicate guess
    await user.type(screen.getByPlaceholderText("Enter number"), "123");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(
        screen.getByText(/You've already guessed 123/)
      ).toBeInTheDocument();
    });

    // Attempts should remain the same
    let attemptsAfterDuplicate = 0;
    gameStore.subscribe((state) => {
      attemptsAfterDuplicate = state.attemptsLeft;
    })();

    expect(attemptsAfterDuplicate).toBe(attemptsAfterFirst);
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
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Please enter a number before submitting/
      );
    });

    // Should not add to history
    expect(screen.queryByText(/Guess 1:/)).not.toBeInTheDocument();
  });

  it("should show validation errors with warning styling", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    const button = screen.getByText("Submit Guess");

    // Try to submit empty
    await user.click(button);

    await waitFor(() => {
      const feedback = screen.getByText(
        /Please enter a number before submitting/
      );
      expect(feedback).toHaveClass("banner");
      expect(feedback).toHaveClass("banner-warning");
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

  it("should show win message with correct attempt count", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    // Get the target number from the store
    let targetNumber = "";
    gameStore.subscribe((state) => {
      targetNumber = state.targetNumber;
    })();

    // Make a correct guess on first try
    await user.type(screen.getByPlaceholderText("Enter number"), targetNumber);
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Congratulations!/)).toBeInTheDocument();
      expect(screen.getByText(/You won with 1 attempt!/)).toBeInTheDocument();
    });
  });

  it("should show win message with plural attempts", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    // Get the target number from the store
    let targetNumber = "";
    gameStore.subscribe((state) => {
      targetNumber = state.targetNumber;
    })();

    const wrongGuesses = ["111", "222", "333"].filter(
      (guess) => guess !== targetNumber
    );
    for (const [index, guess] of wrongGuesses.slice(0, 2).entries()) {
      await user.type(screen.getByPlaceholderText("Enter number"), guess);
      await user.click(screen.getByText("Submit Guess"));
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`Guess ${index + 1}:`))).toBeInTheDocument();
      });
    }

    // Now make correct guess
    await user.type(screen.getByPlaceholderText("Enter number"), targetNumber);
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Congratulations!/)).toBeInTheDocument();
      expect(screen.getByText(/You won with 3 attempts!/)).toBeInTheDocument();
    });
  });

  it("should show lose message when attempts run out", async () => {
    const user = userEvent.setup();
    gameStore.reset();
    gameStore.setMode("single");
    gameStore.updateSettings({ maxAttempts: 2 });
    gameStore.startNewGame();

    render(SinglePlayerGame);

    // Get the target number from the store
    let targetNumber = "";
    gameStore.subscribe((state) => {
      targetNumber = state.targetNumber;
    })();

    // Make wrong guesses until attempts run out
    await user.type(screen.getByPlaceholderText("Enter number"), "111");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Guess 1:/)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Enter number"), "222");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      expect(screen.getByText(/Game Over!/)).toBeInTheDocument();
      expect(
        screen.getByText(/You've used all your attempts/)
      ).toBeInTheDocument();
      expect(screen.getByText(new RegExp(targetNumber))).toBeInTheDocument();
    });
  });

  it("should show correct feedback type for win", async () => {
    const user = userEvent.setup();
    render(SinglePlayerGame);

    // Get the target number from the store
    let targetNumber = "";
    gameStore.subscribe((state) => {
      targetNumber = state.targetNumber;
    })();

    await user.type(screen.getByPlaceholderText("Enter number"), targetNumber);
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      const feedback = screen.getByText(
        /Perfect! All digits in correct positions!/
      );
      expect(feedback).toHaveClass("banner");
      expect(feedback).toHaveClass("banner-correct");
    });
  });

  it("should show correct feedback type for lose", async () => {
    const user = userEvent.setup();
    gameStore.reset();
    gameStore.setMode("single");
    gameStore.updateSettings({ maxAttempts: 1 });
    gameStore.startNewGame();

    render(SinglePlayerGame);

    await user.type(screen.getByPlaceholderText("Enter number"), "111");
    await user.click(screen.getByText("Submit Guess"));

    await waitFor(() => {
      const feedback = screen.getByText(/Better luck next time!/);
      expect(feedback).toHaveClass("banner");
      expect(feedback).toHaveClass("banner-incorrect");
    });
  });
});

describe('SinglePlayerGame round lifecycle', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5)
		gameStore.reset()
		gameStore.setMode('single')
		gameStore.startNewGame()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	async function guess(user: ReturnType<typeof userEvent.setup>, value: string) {
		await user.type(screen.getByLabelText('Guess'), value)
		await user.click(screen.getByRole('button', { name: 'Submit Guess' }))
	}

	it('clears the previous result when a new game starts', async () => {
		const user = userEvent.setup()
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(SinglePlayerGame)

		for (const value of ['111', '222', '333']) {
			await guess(user, value)
		}
		expect(screen.getByText(/Game Over!/)).toBeInTheDocument()

		gameStore.startNewGame()

		await waitFor(() => {
			expect(screen.queryByText(/Game Over!/)).not.toBeInTheDocument()
		})
		expect(screen.queryByText(/Better luck next time!/)).not.toBeInTheDocument()
		expect(screen.getByLabelText('Guess')).toBeEnabled()
	})

	it('clears a validation warning when a new game starts', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await user.click(screen.getByRole('button', { name: 'Submit Guess' }))
		expect(screen.getByRole('alert')).toHaveTextContent(
			/Please enter a number before submitting/,
		)

		gameStore.startNewGame()

		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})
	})

	it('starts a fresh round from the result banner', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '500')
		await user.click(screen.getByRole('button', { name: 'Play again' }))

		expect(screen.queryByText(/Congratulations!/)).not.toBeInTheDocument()
		expect(screen.queryByText(/Guess 1:/)).not.toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByLabelText('Guess')).toHaveFocus()
		})
	})

	it('only offers Play again once the game is over', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '123')

		expect(screen.queryByRole('button', { name: 'Play again' })).not.toBeInTheDocument()
	})

	it('lists the newest guess first', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '123')
		await guess(user, '456')

		const rows = screen.getAllByText(/^Guess \d+:/)
		expect(rows.map((row) => row.textContent)).toEqual([
			'Guess 2: 456',
			'Guess 1: 123',
		])
	})

	it('explains the empty history before the first guess', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		expect(screen.getByText(/No guesses yet/)).toBeInTheDocument()

		await guess(user, '123')

		expect(screen.queryByText(/No guesses yet/)).not.toBeInTheDocument()
	})

	it('keeps focus in the guess field after a button submit', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '123')

		expect(screen.getByLabelText('Guess')).toHaveFocus()
		expect(screen.getByLabelText('Guess')).toHaveValue('')
	})

	it('moves focus to the result when the game ends', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '500')

		await waitFor(() => {
			expect(screen.getByText(/Congratulations!/).closest('.banner')).toHaveFocus()
		})
	})

	it('styles an unfinished guess result as information', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await guess(user, '503')

		expect(
			screen.getByText('Correct digits: 2, Correct positions: 2'),
		).toHaveClass('banner-info')
	})
})

describe('SinglePlayerGame in Thai', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5)
		gameStore.reset()
		gameStore.setLocale('th')
		gameStore.setMode('single')
		gameStore.startNewGame()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('shows the guess controls, feedback, and history in Thai', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		expect(screen.getByText(/ยังไม่มีการทาย/)).toBeInTheDocument()
		await user.type(screen.getByLabelText('คำทาย'), '503')
		await user.click(screen.getByRole('button', { name: 'ส่งคำทาย' }))

		expect(screen.getByRole('status')).toHaveTextContent(
			'เลขถูก: 2, ตำแหน่งถูก: 2',
		)
		expect(screen.getByText('ครั้งที่ 1: 503')).toBeInTheDocument()
	})

	it('translates a visible warning when the language changes', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await user.click(screen.getByRole('button', { name: 'ส่งคำทาย' }))
		expect(screen.getByRole('alert')).toHaveTextContent(
			'กรุณากรอกตัวเลขก่อนส่ง',
		)

		gameStore.setLocale('en')

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(
				'Please enter a number before submitting.',
			)
		})
	})

	it('announces a Thai loss with the answer and a replay action', async () => {
		const user = userEvent.setup()
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(SinglePlayerGame)

		for (const value of ['111', '222', '333']) {
			await user.type(screen.getByLabelText('คำทาย'), value)
			await user.click(screen.getByRole('button', { name: 'ส่งคำทาย' }))
		}

		expect(screen.getByText(/จบเกม!/)).toBeInTheDocument()
		expect(screen.getByText('500', { selector: 'strong' })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'เล่นอีกครั้ง' }),
		).toBeInTheDocument()
	})

	it('congratulates a Thai win', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await user.type(screen.getByLabelText('คำทาย'), '500')
		await user.click(screen.getByRole('button', { name: 'ส่งคำทาย' }))

		expect(
			screen.getByText('ยินดีด้วย! คุณทายเลข 500 ถูกแล้ว!'),
		).toBeInTheDocument()
		expect(screen.getByText('ชนะด้วยการทาย 1 ครั้ง!')).toBeInTheDocument()
	})
})

describe('SinglePlayerGame notepad', () => {
	beforeEach(() => {
		gameStore.reset()
		gameStore.setMode('single')
		gameStore.startNewGame()
	})

	it('cycles a digit through ruled out, in the answer, and clear', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)

		await user.click(screen.getByRole('button', { name: '3, not marked' }))
		expect(
			screen.getByRole('button', { name: '3, ruled out' }),
		).toHaveClass('note-out')

		await user.click(screen.getByRole('button', { name: '3, ruled out' }))
		expect(
			screen.getByRole('button', { name: '3, in the answer' }),
		).toHaveClass('note-in')

		await user.click(screen.getByRole('button', { name: '3, in the answer' }))
		expect(
			screen.getByRole('button', { name: '3, not marked' }),
		).toBeInTheDocument()
	})

	it('clears every note at once', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)
		expect(
			screen.queryByRole('button', { name: 'Clear notes' }),
		).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: '1, not marked' }))
		await user.click(screen.getByRole('button', { name: '7, not marked' }))
		await user.click(screen.getByRole('button', { name: 'Clear notes' }))

		expect(screen.getAllByRole('button', { name: /not marked$/ })).toHaveLength(
			10,
		)
	})

	it('starts every new game with a blank notepad', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)
		await user.click(screen.getByRole('button', { name: '5, not marked' }))

		gameStore.startNewGame()

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: '5, not marked' }),
			).toBeInTheDocument()
		})
	})

	it('keeps notes while guessing', async () => {
		const user = userEvent.setup()
		render(SinglePlayerGame)
		await user.click(screen.getByRole('button', { name: '9, not marked' }))

		await user.type(screen.getByLabelText('Guess'), '123')
		await user.click(screen.getByRole('button', { name: 'Submit Guess' }))

		expect(screen.getByRole('button', { name: '9, ruled out' })).toBeInTheDocument()
	})

	it('labels the notepad in Thai', () => {
		gameStore.setLocale('th')
		render(SinglePlayerGame)

		expect(screen.getByRole('heading', { name: 'กระดาษทด' })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: '0 ยังไม่ทำเครื่องหมาย' }),
		).toBeInTheDocument()
	})
})

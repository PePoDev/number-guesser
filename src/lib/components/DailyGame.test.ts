import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { get } from 'svelte/store'
import DailyGame from './DailyGame.svelte'
import { EMPTY_DAILY_STATS, dailyTarget, gameStore } from '$lib/stores/gameStore'
import { DAILY_STORAGE_KEY } from '$lib/daily/progress'

const answer = dailyTarget(1)

function saved() {
	return JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) ?? 'null')
}

function save(day: number, guesses: string[]) {
	localStorage.setItem(
		DAILY_STORAGE_KEY,
		JSON.stringify({ day, guesses, stats: EMPTY_DAILY_STATS }),
	)
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 9, 14, 9))
	gameStore.reset()
	localStorage.clear()
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
	localStorage.clear()
})

describe('DailyGame', () => {
	it("opens today's puzzle with an empty board and the keypad", () => {
		expect(answer).toBe('42273')
		render(DailyGame)

		expect(screen.getByRole('heading', { name: 'Guessle #1' })).toBeInTheDocument()
		expect(within(screen.getByRole('list', { name: 'Guesses' })).getAllByRole('listitem')).toHaveLength(1)
		const keypad = within(screen.getByRole('group', { name: 'Number keypad' }))
		expect(keypad.getAllByRole('button')).toHaveLength(12)
		expect(keypad.getByRole('button', { name: 'Enter' })).toBeInTheDocument()
	})

	it('types with the keypad and the keyboard, and announces the entry', async () => {
		const user = userEvent.setup()
		const { container } = render(DailyGame)

		await user.click(screen.getByRole('button', { name: '1' }))
		await user.keyboard('2๓')
		expect(screen.getByRole('status')).toHaveTextContent('Current guess: 1 2 3')

		await user.keyboard('{Backspace}')
		await user.click(screen.getByRole('button', { name: 'Delete' }))
		expect(screen.getByRole('status')).toHaveTextContent('Current guess: 1')
		expect([...container.querySelectorAll('.tile')].map((tile) => tile.textContent).join('')).toBe('1')

		await user.keyboard('23456')
		expect(screen.getByRole('status')).toHaveTextContent('Current guess: 1 2 3 4 5')
	})

	it('asks for every digit and clears the warning on the next keypress', async () => {
		const user = userEvent.setup()
		render(DailyGame)

		await user.keyboard('12{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('Enter all 5 digits.')

		await user.keyboard('3')
		expect(screen.getByRole('alert')).toHaveTextContent('')
	})

	it('scores a guess, colors the keys, and saves progress', async () => {
		const user = userEvent.setup()
		const { container } = render(DailyGame)

		await user.keyboard('22379{Enter}')

		const row = 'Guess 1: 2 in another spot, 2 in the right spot, 3 in another spot, 7 in the right spot, 9 not in the number'
		expect(screen.getByRole('status')).toHaveTextContent(row)
		expect(screen.getByRole('list', { name: 'Guesses' })).toHaveTextContent(row)
		expect([...container.querySelectorAll('.tile')].slice(0, 5).map((tile) => tile.className)).toEqual([
			expect.stringContaining('mark-present'),
			expect.stringContaining('mark-correct'),
			expect.stringContaining('mark-present'),
			expect.stringContaining('mark-correct'),
			expect.stringContaining('mark-absent'),
		])
		expect(screen.getByRole('button', { name: '2 in the right spot' })).toHaveClass('mark-correct')
		expect(screen.getByRole('button', { name: '3 in another spot' })).toHaveClass('mark-present')
		expect(screen.getByRole('button', { name: '9 not in the number' })).toHaveClass('mark-absent')
		expect(screen.getByRole('button', { name: '5' })).toHaveClass('mark-none')
		expect(saved()).toMatchObject({ day: 1, guesses: ['22379'] })
	})

	it('rejects a repeated guess without using a try', async () => {
		const user = userEvent.setup()
		render(DailyGame)

		await user.keyboard('11111{Enter}11111{Enter}')

		expect(screen.getByRole('alert')).toHaveTextContent("You've already tried 11111.")
		expect(get(gameStore).daily.guesses).toEqual(['11111'])
	})

	it('shows the result, stats, and countdown after a win', async () => {
		const user = userEvent.setup()
		render(DailyGame)

		await user.keyboard(`12345{Enter}${answer}{Enter}`)

		const result = screen.getByText('Solved in 2 tries!').parentElement
		expect(result).toHaveFocus()
		expect(screen.queryByRole('group', { name: 'Number keypad' })).not.toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'Statistics' })).toHaveTextContent(
			/Played\s*1\s*Win %\s*100\s*Current streak\s*1\s*Max streak\s*1/,
		)
		expect(screen.getByText('2 tries: 1 win')).toBeInTheDocument()
		expect(screen.getByRole('timer')).toHaveTextContent('15:00:00')
		expect(saved().stats).toMatchObject({ played: 1, wins: 1, distribution: [0, 1, 0, 0, 0, 0] })

		await user.keyboard('5')
		expect(get(gameStore).daily.guesses).toHaveLength(2)
	})

	it('reveals the answer after six misses', async () => {
		const user = userEvent.setup()
		render(DailyGame)

		for (const guess of ['00000', '11111', '33333', '55555', '66666', '88888']) {
			await user.keyboard(`${guess}{Enter}`)
		}

		expect(screen.getByText(/So close! The number was/)).toHaveTextContent(
			`So close! The number was ${answer}`,
		)
		expect(screen.getByRole('region', { name: 'Statistics' })).toHaveTextContent(/Win %\s*0\s*Current/)
	})

	it("restores today's progress and starts fresh on a new day", () => {
		save(1, ['12345'])
		const { unmount } = render(DailyGame)
		expect(screen.getByRole('list', { name: 'Guesses' })).toHaveTextContent('Guess 1:')
		unmount()

		gameStore.reset()
		vi.setSystemTime(new Date(2026, 9, 15, 9))
		render(DailyGame)
		expect(screen.getByRole('heading', { name: 'Guessle #2' })).toBeInTheDocument()
		expect(screen.getByRole('list', { name: 'Guesses' })).not.toHaveTextContent('Guess 1:')
	})

	it('copies a spoiler-free result on desktop', async () => {
		const user = userEvent.setup()
		save(1, ['12345', answer])
		render(DailyGame)

		await user.click(screen.getByRole('button', { name: 'Share' }))

		expect(await navigator.clipboard.readText()).toBe(
			`Guessle #1 2/6\n\n⬜🟩🟨🟨⬜\n🟩🟩🟩🟩🟩\n\n${window.location.origin}/`,
		)
		expect(screen.getAllByText('Copied!')).toHaveLength(2)
	})

	it('uses the share sheet on touch screens and stays quiet when it is dismissed', async () => {
		const user = userEvent.setup()
		const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
		vi.stubGlobal('navigator', { ...navigator, share, clipboard: navigator.clipboard })
		vi.stubGlobal('matchMedia', () => ({ matches: true }))
		save(1, ['12345', '11111', '22222', '33333', '44444', '55555'])
		render(DailyGame)

		await user.click(screen.getByRole('button', { name: 'Share' }))

		expect(share).toHaveBeenCalledWith({
			text: expect.stringMatching(/^Guessle #1 X\/6\n\n/),
			url: `${window.location.origin}/`,
		})
		expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
		expect(screen.getByRole('alert')).toHaveTextContent('')
	})

	it('explains when the result cannot be shared', async () => {
		const user = userEvent.setup()
		save(1, [answer])
		render(DailyGame)
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

		await user.click(screen.getByRole('button', { name: 'Share' }))

		expect(screen.getByRole('alert')).toHaveTextContent("Couldn't share your result. Please try again.")
	})

	it('leaves keys alone in fields, dialogs, hidden panels, and focused buttons', async () => {
		const user = userEvent.setup()
		render(DailyGame)
		const field = document.createElement('input')
		document.body.append(field)

		await user.click(field)
		await user.keyboard('12')
		expect(get(gameStore).daily.guesses).toEqual([])
		expect(field).toHaveValue('12')

		await user.keyboard('{Tab}')
		await user.keyboard('12345')
		const delete_ = screen.getByRole('button', { name: 'Delete' })
		delete_.focus()
		await user.keyboard('{Enter}')
		expect(get(gameStore).daily.guesses).toEqual([])
		expect(screen.getByRole('status')).toHaveTextContent('Current guess: 1 2 3 4')

		document.querySelector('.game-area')?.parentElement?.setAttribute('hidden', '')
		await user.keyboard('9')
		expect(screen.getByRole('list', { name: 'Guesses', hidden: true })).toHaveTextContent('Current guess: 1 2 3 4')
		field.remove()
	})

	it('switches an unstarted board at midnight but keeps a finished result', async () => {
		vi.useRealTimers()
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
		vi.setSystemTime(new Date(2026, 9, 14, 23, 59, 58))
		const { unmount } = render(DailyGame)

		await vi.advanceTimersByTimeAsync(3000)
		expect(screen.getByRole('heading', { name: 'Guessle #2' })).toBeInTheDocument()
		unmount()

		gameStore.reset()
		vi.setSystemTime(new Date(2026, 9, 14, 23, 59, 58))
		save(1, [answer])
		render(DailyGame)
		expect(screen.getByRole('timer')).toHaveTextContent('00:00:02')

		await vi.advanceTimersByTimeAsync(3000)
		expect(screen.getByRole('heading', { name: 'Guessle #1' })).toBeInTheDocument()
		screen.getByRole('button', { name: "Play today's Guessle" }).click()
		await vi.advanceTimersByTimeAsync(0)
		expect(screen.getByRole('heading', { name: 'Guessle #2' })).toHaveFocus()
		expect(screen.getByRole('group', { name: 'Number keypad' })).toBeInTheDocument()
	})

	it('offers Classic after the puzzle', async () => {
		const user = userEvent.setup()
		save(1, [answer])
		render(DailyGame)

		await user.click(screen.getByRole('button', { name: 'Play Classic' }))

		expect(get(gameStore).mode).toBe('single')
		expect(get(gameStore).targetNumber).toBe('500')
	})

	it('speaks Thai', async () => {
		const user = userEvent.setup()
		gameStore.setLocale('th')
		render(DailyGame)

		expect(screen.getByRole('group', { name: 'แป้นตัวเลข' })).toBeInTheDocument()
		await user.keyboard(`${answer}{Enter}`)

		expect(screen.getByText('ทายถูกตั้งแต่ครั้งแรก!')).toBeInTheDocument()
		expect(screen.getByRole('region', { name: 'สถิติ' })).toHaveTextContent('ชนะติดต่อกัน')
		expect(screen.getByText(/Guessle ถัดไปใน/)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'แชร์' })).toBeInTheDocument()
	})
})

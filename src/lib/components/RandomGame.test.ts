import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/svelte'
import { createRawSnippet, tick } from 'svelte'
import userEvent from '@testing-library/user-event'
import { get } from 'svelte/store'
import RandomGame from './RandomGame.svelte'
import { gameStore } from '$lib/stores/gameStore'
import { celebrate } from '$lib/effects/celebrate'

vi.mock('$lib/effects/celebrate')

function board() {
	return screen.getByRole('list', { name: 'Guesses' })
}

function rows() {
	return within(board()).getAllByRole('listitem', { hidden: true })
}

function result(playAgain = 'Play again') {
	return screen.getByRole('button', { name: playAgain }).parentElement
}

beforeEach(() => {
	gameStore.reset()
	gameStore.setMode('random')
	gameStore.startNewGame()
	vi.mocked(celebrate).mockClear()
})

describe('RandomGame', () => {
	it('opens an empty row for every attempt under the tries left', () => {
		render(RandomGame)

		expect(screen.getByRole('heading', { name: '7 tries left' })).toBeInTheDocument()
		expect(rows()).toHaveLength(7)
		expect(within(board()).getAllByRole('listitem')).toHaveLength(1)
		expect(within(board()).getByRole('listitem')).toHaveTextContent('Current guess is empty')
		expect(screen.getByText('in the number')).toBeInTheDocument()
		expect(screen.getByText('in the right spot')).toBeInTheDocument()
		const keypad = within(screen.getByRole('group', { name: 'Number keypad' }))
		expect(keypad.getAllByRole('button')).toHaveLength(12)
	})

	it('draws a number when it opens without one', () => {
		gameStore.reset()
		gameStore.setMode('random')
		render(RandomGame)

		expect(get(gameStore).targetNumber).toBe('500')
		expect(screen.getByRole('heading', { name: '7 tries left' })).toBeInTheDocument()
	})

	it('types with the keypad and the keyboard, and announces the entry', async () => {
		const user = userEvent.setup()
		const { container } = render(RandomGame)

		await user.click(screen.getByRole('button', { name: '5' }))
		await user.keyboard('0๑9')
		expect(screen.getByRole('status')).toHaveTextContent(/^Current guess: 5 0 1$/)

		await user.keyboard('{Backspace}')
		await user.click(screen.getByRole('button', { name: 'Delete' }))
		expect(screen.getByRole('status')).toHaveTextContent(/^Current guess: 5$/)
		expect([...container.querySelectorAll('.tile')].map((tile) => tile.textContent).join('')).toBe('5')
	})

	it('asks for every digit without using a try, and clears the warning on the next keypress', async () => {
		const user = userEvent.setup()
		render(RandomGame)

		await user.keyboard('12{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('Enter all 3 digits.')
		expect(screen.getByRole('heading', { name: '7 tries left' })).toBeInTheDocument()

		await user.keyboard('3')
		expect(screen.getByRole('alert')).toHaveTextContent('')
	})

	it('rejects a repeated guess without using a try', async () => {
		const user = userEvent.setup()
		render(RandomGame)

		await user.keyboard('123{Enter}123{Enter}')

		expect(screen.getByRole('alert')).toHaveTextContent("You've already tried 123.")
		expect(screen.getByRole('heading', { name: '6 tries left' })).toBeInTheDocument()
		expect(get(gameStore).guessHistory).toHaveLength(1)
	})

	it('shows the hints beside each guess and counts the tries down', async () => {
		const user = userEvent.setup()
		render(RandomGame)

		await user.keyboard('123{Enter}')
		const first = 'Guess 1: 1 2 3, 0 in the number, 0 in the right spot'
		expect(screen.getByRole('status')).toHaveTextContent(first)
		expect(screen.getByRole('heading', { name: '6 tries left' })).toBeInTheDocument()

		await user.keyboard('501{Enter}')
		const second = 'Guess 2: 5 0 1, 2 in the number, 2 in the right spot'
		expect(screen.getByRole('status')).toHaveTextContent(second)
		expect(screen.getByRole('heading', { name: '5 tries left' })).toBeInTheDocument()

		const played = within(board()).getAllByRole('listitem')
		expect(played[0]).toHaveTextContent(new RegExp(`^${first}\\s*1\\s*2\\s*3\\s*0\\s*0$`))
		expect(played[1]).toHaveTextContent(new RegExp(`^${second}\\s*5\\s*0\\s*1\\s*2\\s*2$`))
		expect(played[2]).toHaveTextContent('Current guess is empty')
		expect(rows()).toHaveLength(7)
	})

	it('says when one try is left', async () => {
		const user = userEvent.setup()
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(RandomGame)

		await user.keyboard('123{Enter}456{Enter}')

		expect(screen.getByRole('heading', { name: '1 try left' })).toBeInTheDocument()
	})

	it('celebrates a win, focuses the result, and puts the keypad away', async () => {
		const user = userEvent.setup()
		render(RandomGame)

		await user.keyboard('123{Enter}500{Enter}')

		expect(result()).toHaveFocus()
		expect(result()).toHaveTextContent('Solved in 2 tries! The number was 500')
		expect(screen.getByRole('heading', { name: 'Solved in 2 tries!' })).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('Guess 2: 5 0 0, 3 in the number, 3 in the right spot')
		expect(screen.queryByRole('group', { name: 'Number keypad' })).not.toBeInTheDocument()
		expect(rows()).toHaveLength(2)
		expect(celebrate).toHaveBeenCalledOnce()
		expect(celebrate).toHaveBeenCalledWith(true)

		await user.keyboard('123{Enter}')
		expect(get(gameStore).guessHistory).toHaveLength(2)
	})

	it('celebrates without sound when sound effects are off', async () => {
		const user = userEvent.setup()
		gameStore.setSound(false)
		render(RandomGame)

		await user.keyboard('500{Enter}')

		expect(result()).toHaveTextContent('Got it in one! The number was 500')
		expect(celebrate).toHaveBeenCalledWith(false)
	})

	it('reveals the number after the last attempt', async () => {
		const user = userEvent.setup()
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(RandomGame)
		expect(screen.getByRole('heading', { name: '3 tries left' })).toBeInTheDocument()
		expect(rows()).toHaveLength(3)

		await user.keyboard('123{Enter}456{Enter}789{Enter}')

		expect(result()).toHaveFocus()
		expect(result()).toHaveTextContent('Out of tries The number was 500')
		expect(screen.getByRole('heading', { name: 'Out of tries' })).toBeInTheDocument()
		expect(screen.queryByRole('group', { name: 'Number keypad' })).not.toBeInTheDocument()
		expect(rows()).toHaveLength(3)
		expect(celebrate).not.toHaveBeenCalled()
	})

	it('plays again with a fresh number, a clean board, and focus on the heading', async () => {
		const user = userEvent.setup()
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(RandomGame)
		await user.keyboard('123{Enter}456{Enter}789{Enter}')

		vi.mocked(Math.random).mockReturnValue(0.123)
		await user.click(screen.getByRole('button', { name: 'Play again' }))

		const heading = screen.getByRole('heading', { name: '3 tries left' })
		expect(heading).toHaveFocus()
		expect(rows()).toHaveLength(3)
		expect(within(board()).getAllByRole('listitem')).toHaveLength(1)
		expect(screen.getByRole('group', { name: 'Number keypad' })).toBeInTheDocument()

		await user.keyboard('123{Enter}')
		expect(result()).toHaveTextContent('Got it in one! The number was 123')
	})

	it('drops the typed entry and warning when a new game starts', async () => {
		const user = userEvent.setup()
		render(RandomGame)
		await user.keyboard('12{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('Enter all 3 digits.')

		gameStore.updateSettings({ digitCount: 5 })
		gameStore.startNewGame()
		await tick()

		expect(screen.getByRole('alert')).toHaveTextContent('')
		expect(screen.getByRole('status')).toHaveTextContent('Current guess is empty')
		expect(within(board()).getByRole('listitem')).toHaveTextContent('Current guess is empty')

		await user.keyboard('1234{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('Enter all 5 digits.')
		await user.keyboard('56')
		expect(screen.getByRole('status')).toHaveTextContent(/^Current guess: 1 2 3 4 5$/)
		await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}50000{Enter}')
		expect(result()).toHaveTextContent('Got it in one! The number was 50000')
	})

	it('sets the toolbar beside the tries heading', () => {
		const toolbar = createRawSnippet(() => ({
			render: () => '<div role="group" aria-label="Single-player type"></div>',
		}))
		render(RandomGame, { props: { toolbar } })

		const group = screen.getByRole('group', { name: 'Single-player type' })
		const heading = screen.getByRole('heading', { name: '7 tries left' })
		expect(group.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
		expect(group.parentElement).toBe(heading.parentElement)
	})

	it('speaks Thai', async () => {
		const user = userEvent.setup()
		gameStore.setLocale('th')
		render(RandomGame)

		expect(screen.getByRole('heading', { name: 'เหลือ 7 ครั้ง' })).toBeInTheDocument()
		expect(screen.getByRole('list', { name: 'คำทาย' })).toBeInTheDocument()
		expect(screen.getByText('มีในคำตอบ')).toBeInTheDocument()
		expect(screen.getByText('ถูกตำแหน่ง')).toBeInTheDocument()
		expect(screen.getByRole('group', { name: 'แป้นตัวเลข' })).toBeInTheDocument()

		await user.keyboard('12{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('กรอกให้ครบ 3 หลัก')
		await user.keyboard('3{Enter}')
		expect(screen.getByRole('status')).toHaveTextContent('ครั้งที่ 1: 1 2 3 มีในคำตอบ 0 ตัว ถูกตำแหน่ง 0 ตัว')
		await user.keyboard('123{Enter}')
		expect(screen.getByRole('alert')).toHaveTextContent('คุณทาย 123 ไปแล้ว')

		await user.keyboard('{Backspace}{Backspace}{Backspace}500{Enter}')
		expect(result('เล่นอีกครั้ง')).toHaveFocus()
		expect(result('เล่นอีกครั้ง')).toHaveTextContent('ทายถูกใน 2 ครั้ง! คำตอบคือ 500')
		expect(screen.getByRole('heading', { name: 'ทายถูกใน 2 ครั้ง!' })).toBeInTheDocument()
	})

	it('reveals the number in Thai after the last attempt', async () => {
		const user = userEvent.setup()
		gameStore.setLocale('th')
		gameStore.updateSettings({ maxAttempts: 3 })
		gameStore.startNewGame()
		render(RandomGame)

		await user.keyboard('123{Enter}456{Enter}789{Enter}')

		expect(screen.getByText('500')).toHaveProperty('tagName', 'STRONG')
		expect(result('เล่นอีกครั้ง')).toHaveTextContent('หมดโอกาสทายแล้ว คำตอบคือ 500')
		expect(screen.getByRole('heading', { name: 'หมดโอกาสทายแล้ว' })).toBeInTheDocument()
	})
})

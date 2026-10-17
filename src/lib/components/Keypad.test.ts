import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import Keypad from './Keypad.svelte'
import { gameStore, type TileState } from '$lib/stores/gameStore'

function setup(states?: Partial<Record<string, TileState>>) {
	const ontype = vi.fn<(digit: string) => void>()
	const onerase = vi.fn<() => void>()
	const onsubmit = vi.fn<() => void>()
	const view = render(Keypad, { props: { states, ontype, onerase, onsubmit } })
	return { ...view, ontype, onerase, onsubmit }
}

function attach<T extends HTMLElement>(element: T): T {
	document.body.append(element)
	onTestFinished(() => element.remove())
	return element
}

beforeEach(() => {
	gameStore.reset()
})

describe('Keypad', () => {
	it('offers ten digits, Delete, and Enter in one labelled group', () => {
		setup()

		const keypad = within(screen.getByRole('group', { name: 'Number keypad' }))
		expect(keypad.getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
			'1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Delete', 'Enter',
		])
	})

	it('reports tapped digits, Delete, and Enter', async () => {
		const user = userEvent.setup()
		const { ontype, onerase, onsubmit } = setup()

		await user.click(screen.getByRole('button', { name: '7' }))
		await user.click(screen.getByRole('button', { name: '0' }))
		await user.click(screen.getByRole('button', { name: 'Delete' }))
		await user.click(screen.getByRole('button', { name: 'Enter' }))

		expect(ontype.mock.calls).toEqual([['7'], ['0']])
		expect(onerase).toHaveBeenCalledOnce()
		expect(onsubmit).toHaveBeenCalledOnce()
	})

	it('lets go of a tapped key, so a physical Enter submits instead of pressing it again', async () => {
		const user = userEvent.setup()
		const { ontype, onsubmit } = setup()
		const three = screen.getByRole('button', { name: '3' })

		await user.click(three)
		expect(three).not.toHaveFocus()
		await user.keyboard('{Enter}')

		expect(ontype.mock.calls).toEqual([['3']])
		expect(onsubmit).toHaveBeenCalledOnce()
	})

	it('reads digits, Thai numerals, Backspace, and Enter from the keyboard', async () => {
		const user = userEvent.setup()
		const { ontype, onerase, onsubmit } = setup()

		await user.keyboard('4๗a{Backspace}{Enter}')

		expect(ontype.mock.calls).toEqual([['4'], ['7']])
		expect(onerase).toHaveBeenCalledOnce()
		expect(onsubmit).toHaveBeenCalledOnce()
	})

	it('leaves shortcuts and composing input alone', async () => {
		const user = userEvent.setup()
		const { ontype, onsubmit } = setup()

		await user.keyboard('{Control>}1{/Control}{Meta>}2{/Meta}{Alt>}3{/Alt}')
		await fireEvent.keyDown(document.body, { key: 'Enter', isComposing: true })

		expect(ontype).not.toHaveBeenCalled()
		expect(onsubmit).not.toHaveBeenCalled()

		await fireEvent.keyDown(document.body, { key: 'Enter' })
		expect(onsubmit).toHaveBeenCalledOnce()
	})

	it('leaves keys typed in fields and dialogs alone', async () => {
		const user = userEvent.setup()
		const { ontype, onerase, onsubmit } = setup()
		const field = attach(document.createElement('input'))
		const dialog = attach(document.createElement('div'))
		dialog.setAttribute('role', 'dialog')
		dialog.tabIndex = -1

		await user.click(field)
		await user.keyboard('12{Backspace}{Enter}')
		expect(field).toHaveValue('1')

		dialog.focus()
		await user.keyboard('5{Backspace}{Enter}')

		expect(ontype).not.toHaveBeenCalled()
		expect(onerase).not.toHaveBeenCalled()
		expect(onsubmit).not.toHaveBeenCalled()
	})

	it('lets a focused button take Enter instead of submitting', async () => {
		const user = userEvent.setup()
		const { ontype, onerase, onsubmit } = setup()
		const outside = attach(document.createElement('button'))
		outside.textContent = 'Random'

		screen.getByRole('button', { name: 'Delete' }).focus()
		await user.keyboard('{Enter}')
		const eight = screen.getByRole('button', { name: '8' })
		eight.focus()
		await user.keyboard('{Enter}')
		outside.focus()
		await user.keyboard('{Enter}')

		expect(onerase).toHaveBeenCalledOnce()
		expect(ontype.mock.calls).toEqual([['8']])
		expect(onsubmit).not.toHaveBeenCalled()
		expect(outside).toHaveFocus()
	})

	it('keeps focus on a key pressed from the keyboard', async () => {
		const user = userEvent.setup()
		const { ontype } = setup()
		const six = screen.getByRole('button', { name: '6' })

		six.focus()
		await user.keyboard(' ')

		expect(ontype.mock.calls).toEqual([['6']])
		expect(six).toHaveFocus()
	})

	it('ignores the keyboard while its panel is hidden', async () => {
		const user = userEvent.setup()
		const { container, ontype, onerase, onsubmit } = setup()
		container.setAttribute('hidden', '')

		await user.keyboard('1{Backspace}{Enter}')

		expect(ontype).not.toHaveBeenCalled()
		expect(onerase).not.toHaveBeenCalled()
		expect(onsubmit).not.toHaveBeenCalled()
	})

	it('names each key by the best clue its digit has earned', () => {
		setup({ '2': 'correct', '3': 'present', '9': 'absent' })

		expect(screen.getByRole('button', { name: '2 in the right spot' })).toHaveClass('mark-correct')
		expect(screen.getByRole('button', { name: '3 in another spot' })).toHaveClass('mark-present')
		expect(screen.getByRole('button', { name: '9 not in the number' })).toHaveClass('mark-absent')
		expect(screen.getByRole('button', { name: '5' })).toHaveClass('mark-none')
	})

	it('speaks Thai', async () => {
		const user = userEvent.setup()
		gameStore.setLocale('th')
		const { onerase, onsubmit } = setup({ '2': 'correct' })

		const keypad = within(screen.getByRole('group', { name: 'แป้นตัวเลข' }))
		expect(keypad.getByRole('button', { name: '2 ถูกตำแหน่ง' })).toBeInTheDocument()
		await user.click(keypad.getByRole('button', { name: 'ลบ' }))
		await user.click(keypad.getByRole('button', { name: 'ส่ง' }))

		expect(onerase).toHaveBeenCalledOnce()
		expect(onsubmit).toHaveBeenCalledOnce()
	})
})

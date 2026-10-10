import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { get } from 'svelte/store'
import SettingsModal from './SettingsModal.svelte'
import { gameStore, type GameMode } from '$lib/stores/gameStore'

describe('SettingsModal Component', () => {
	const mockOnClose = vi.fn()

	function renderSettings(mode: GameMode = 'single') {
		gameStore.setMode(mode)
		return render(SettingsModal, {
			props: { mode, onclose: mockOnClose },
		})
	}

	beforeEach(() => {
		mockOnClose.mockClear()
		gameStore.reset()
	})

	it('shows Thai titles, labels, and options', () => {
		gameStore.setLocale('th')

		renderSettings('single')

		expect(
			screen.getByRole('heading', { name: 'ตั้งค่าโหมดเล่นคนเดียว' }),
		).toBeInTheDocument()
		expect(screen.getByLabelText('จำนวนหลัก:')).toHaveDisplayValue('3 หลัก')
		expect(screen.getByLabelText('จำนวนครั้งที่ทายได้:')).toHaveDisplayValue(
			'7 ครั้ง',
		)
		expect(
			screen.getByRole('button', { name: 'ปิดการตั้งค่า' }),
		).toBeInTheDocument()
	})

	it.each([
		['single', 'Single Player Settings'],
		['multi', 'Local Multiplayer Settings'],
		['online', 'Online Multiplayer Settings'],
	] as const)('shows the %s mode title', (mode, title) => {
		renderSettings(mode)

		expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
	})

	it('does not offer a game mode selector', () => {
		renderSettings()

		expect(screen.queryByLabelText('Game Mode:')).not.toBeInTheDocument()
	})

	it('shows only single-player settings', () => {
		renderSettings('single')

		expect(screen.getByLabelText('Number of Digits:')).toBeInTheDocument()
		expect(screen.getByLabelText('Max Attempts:')).toBeInTheDocument()
		expect(
			screen.queryByLabelText('Number of Players:'),
		).not.toBeInTheDocument()
	})

	it.each(['multi', 'online'] as const)(
		'shows only multiplayer settings for %s mode',
		(mode) => {
			renderSettings(mode)

			expect(screen.getByLabelText('Number of Digits:')).toBeInTheDocument()
			expect(screen.getByLabelText('Number of Players:')).toBeInTheDocument()
			expect(screen.queryByLabelText('Max Attempts:')).not.toBeInTheDocument()
		},
	)

	it('offers all supported digit and attempt values', () => {
		renderSettings()
		const digits = screen.getByLabelText(
			'Number of Digits:',
		) as HTMLSelectElement
		const attempts = screen.getByLabelText(
			'Max Attempts:',
		) as HTMLSelectElement

		expect(Array.from(digits.options, (option) => option.text)).toEqual([
			'2 digits',
			'3 digits',
			'4 digits',
			'5 digits',
		])
		expect(Array.from(attempts.options, (option) => option.text)).toEqual([
			'3 attempts',
			'5 attempts',
			'7 attempts',
			'10 attempts',
			'15 attempts',
			'20 attempts',
		])
	})

	it('offers two to four multiplayer players', () => {
		renderSettings('multi')
		const players = screen.getByLabelText(
			'Number of Players:',
		) as HTMLSelectElement

		expect(Array.from(players.options, (option) => option.text)).toEqual([
			'2 players',
			'3 players',
			'4 players',
		])
	})

	it('reflects and updates current settings', async () => {
		gameStore.updateSettings({ digitCount: 4, maxAttempts: 10 })
		const user = userEvent.setup()
		renderSettings()
		const digits = screen.getByLabelText('Number of Digits:')
		const attempts = screen.getByLabelText('Max Attempts:')

		expect(digits).toHaveValue('4')
		expect(attempts).toHaveValue('10')
		await user.selectOptions(digits, '5')
		await user.selectOptions(attempts, '15')

		await waitFor(() => {
			expect(get(gameStore).settings).toMatchObject({
				digitCount: 5,
				maxAttempts: 15,
			})
		})
	})

	it('updates multiplayer player count', async () => {
		const user = userEvent.setup()
		renderSettings('multi')

		await user.selectOptions(screen.getByLabelText('Number of Players:'), '3')

		expect(get(gameStore).settings.playerCount).toBe(3)
	})

	it.each([
		['Close settings', 'button'],
		['Close', 'text'],
	] as const)('closes from the %s control', async (name, query) => {
		const user = userEvent.setup()
		renderSettings()
		const button =
			query === 'button'
				? screen.getByRole('button', { name })
				: screen.getByText(name)

		await user.click(button)

		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	it('closes from the backdrop and Escape, but not modal content', async () => {
		const user = userEvent.setup()
		renderSettings()
		const dialog = screen.getByRole('dialog')

		await user.click(screen.getByRole('heading'))
		expect(mockOnClose).not.toHaveBeenCalled()
		await user.click(dialog)
		expect(mockOnClose).toHaveBeenCalledTimes(1)
		await user.keyboard('{Escape}')
		expect(mockOnClose).toHaveBeenCalledTimes(2)
	})

	it('traps focus within the modal', async () => {
		const user = userEvent.setup()
		renderSettings()
		const focusables = screen
			.getByRole('dialog')
			.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			)
		const last = focusables[focusables.length - 1]

		last.focus()
		await user.tab()
		expect(focusables[0]).toHaveFocus()
		focusables[0].focus()
		await user.tab({ shift: true })
		expect(last).toHaveFocus()
	})

	it('restores focus when unmounted', () => {
		const trigger = document.createElement('button')
		document.body.appendChild(trigger)
		trigger.focus()
		const { unmount } = renderSettings()

		unmount()

		expect(trigger).toHaveFocus()
		trigger.remove()
	})

	it('keeps the modal dialog styling and accessibility attributes', () => {
		renderSettings()
		const dialog = screen.getByRole('dialog')

		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(dialog).toHaveClass('backdrop-blur-md')
		expect(
			dialog.querySelector('.animate-modal-slide-in'),
		).toBeInTheDocument()
	})
})

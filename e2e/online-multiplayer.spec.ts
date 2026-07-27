import { expect, test, type Page } from '@playwright/test'

async function selectOnlineMode(page: Page, playerCount = '2') {
	await page.getByLabel('Open Settings').click()
	await page.getByLabel('Game Mode:').selectOption('online')
	await page.getByLabel('Number of Players:').selectOption(playerCount)
	await page.getByText('Close', { exact: true }).click()
}

async function readRoomId(page: Page): Promise<string> {
	const roomId = (await page.getByTestId('room-id').textContent())?.trim() ?? ''
	expect(roomId).toMatch(/^[A-Z2-9]{6}$/)
	return roomId
}

test('two remote players create, join, play, and finish a room', async ({
	browser,
}) => {
	const hostContext = await browser.newContext()
	const guestContext = await browser.newContext()
	const host = await hostContext.newPage()
	const guest = await guestContext.newPage()

	await host.goto('/')
	await guest.goto('/')
	await selectOnlineMode(host)
	await selectOnlineMode(guest)

	await host.getByLabel('Display name').fill('Ada')
	await host.getByRole('button', { name: 'Create Room' }).click()
	const roomId = await readRoomId(host)

	await guest.getByLabel('Display name').fill('Lin')
	await guest.getByLabel('Room ID').fill(roomId)
	await guest.getByRole('button', { name: 'Join Room' }).click()

	await expect(host.getByText('Lin')).toBeVisible()
	await host.getByLabel('Secret number').fill('123')
	await host.getByRole('button', { name: 'Ready' }).click()
	await guest.getByLabel('Secret number').fill('456')
	await guest.getByRole('button', { name: 'Ready' }).click()
	await host.getByRole('button', { name: 'Start Game' }).click()

	await host.getByLabel('Target player').selectOption({ label: 'Lin' })
	await host.getByLabel('Guess').fill('456')
	await host.getByRole('button', { name: 'Submit Guess' }).click()

	await expect(host.getByText('Ada wins!')).toBeVisible()
	await expect(guest.getByText('Ada wins!')).toBeVisible()

	await hostContext.close()
	await guestContext.close()
})

test('refresh reconnects the same browser to its room', async ({ browser }) => {
	const hostContext = await browser.newContext()
	const host = await hostContext.newPage()

	await host.goto('/')
	await selectOnlineMode(host)
	await host.getByLabel('Display name').fill('Ada')
	await host.getByRole('button', { name: 'Create Room' }).click()
	const roomId = await readRoomId(host)

	await host.reload()

	await expect(host.getByText(`Room ${roomId}`)).toBeVisible()
	await expect(host.getByText('Ada')).toBeVisible()
	await hostContext.close()
})

test('three players rotate turns and the last active player wins', async ({
	browser,
}) => {
	const hostContext = await browser.newContext()
	const secondContext = await browser.newContext()
	const thirdContext = await browser.newContext()
	const host = await hostContext.newPage()
	const second = await secondContext.newPage()
	const third = await thirdContext.newPage()

	await Promise.all([host.goto('/'), second.goto('/'), third.goto('/')])
	await Promise.all([
		selectOnlineMode(host, '3'),
		selectOnlineMode(second, '3'),
		selectOnlineMode(third, '3'),
	])

	await host.getByLabel('Display name').fill('Ada')
	await host.getByRole('button', { name: 'Create Room' }).click()
	const roomId = await readRoomId(host)

	await second.getByLabel('Display name').fill('Lin')
	await second.getByLabel('Room ID').fill(roomId)
	await second.getByRole('button', { name: 'Join Room' }).click()
	await third.getByLabel('Display name').fill('Grace')
	await third.getByLabel('Room ID').fill(roomId)
	await third.getByRole('button', { name: 'Join Room' }).click()

	await host.getByLabel('Secret number').fill('111')
	await host.getByRole('button', { name: 'Ready' }).click()
	await second.getByLabel('Secret number').fill('222')
	await second.getByRole('button', { name: 'Ready' }).click()
	await third.getByLabel('Secret number').fill('333')
	await third.getByRole('button', { name: 'Ready' }).click()
	await host.getByRole('button', { name: 'Start Game' }).click()

	await host.getByLabel('Target player').selectOption({ label: 'Lin' })
	await host.getByLabel('Guess').fill('999')
	await host.getByRole('button', { name: 'Submit Guess' }).click()
	await expect(second.getByText("Lin's turn")).toBeVisible()

	await second.getByLabel('Target player').selectOption({ label: 'Ada' })
	await second.getByLabel('Guess').fill('111')
	await second.getByRole('button', { name: 'Submit Guess' }).click()
	await expect(second.getByText("Lin's turn")).toBeVisible()

	await second.getByLabel('Target player').selectOption({ label: 'Grace' })
	await second.getByLabel('Guess').fill('333')
	await second.getByRole('button', { name: 'Submit Guess' }).click()
	await expect(host.getByText('Lin wins!')).toBeVisible()
	await expect(second.getByText('Lin wins!')).toBeVisible()
	await expect(third.getByText('Lin wins!')).toBeVisible()

	await Promise.all([
		hostContext.close(),
		secondContext.close(),
		thirdContext.close(),
	])
})

test('shows a friendly error for a missing room', async ({ page }) => {
	await page.goto('/')
	await selectOnlineMode(page)
	await page.getByLabel('Display name').fill('Ada')
	await page.getByLabel('Room ID').fill('ZZZZZZ')
	await page.getByRole('button', { name: 'Join Room' }).click()

	await expect(page.getByRole('alert')).toHaveText(
		'Room not found or expired.',
	)
})

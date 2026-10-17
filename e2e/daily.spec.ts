import { test, expect, type Page } from '@playwright/test'

test.use({ timezoneId: 'Asia/Bangkok' })

const day1 = new Date('2026-10-14T09:00:00+07:00')
const day2 = new Date('2026-10-15T09:00:00+07:00')

test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(day1)
	await page.route('https://api.github.com/repos/PePoDev/guessle', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ stargazers_count: 128 }),
		})
	})
})

async function guess(page: Page, digits: string) {
	await page.keyboard.type(digits)
	await page.keyboard.press('Enter')
}

test("wins today's Guessle, keeps it after a reload, shares it, and continues the streak", async ({
	page,
	context,
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	await page.goto('/')

	await expect(page.getByRole('heading', { name: 'Guessle #1' })).toBeVisible()
	await expect(page.getByRole('button', { name: /New Game/ })).toBeDisabled()
	await guess(page, '12345')
	await expect(page.getByRole('list', { name: 'Guesses' })).toContainText(
		'Guess 1: 1 not in the number, 2 in the right spot, 3 in another spot, 4 in another spot, 5 not in the number',
	)
	await expect(page.getByRole('button', { name: '2 in the right spot' })).toBeVisible()

	const keypad = page.getByRole('group', { name: 'Number keypad' })
	for (const digit of '42273') {
		await keypad.getByRole('button', { name: new RegExp(`^${digit}`) }).click()
	}
	await keypad.getByRole('button', { name: 'Enter' }).click()

	await expect(page.getByText('Solved in 2 tries!')).toBeVisible()
	await expect(page.getByRole('region', { name: 'Statistics' })).toContainText('Current streak')
	await expect(page.getByRole('timer')).toHaveText('15:00:00')
	await page.getByRole('button', { name: 'Share' }).click()
	await expect(page.getByText('Copied!', { exact: true }).first()).toBeVisible()
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		'Guessle #1 2/6\n\n⬜🟩🟨🟨⬜\n🟩🟩🟩🟩🟩\n\nhttp://localhost:5173/',
	)

	await page.reload()
	await expect(page.getByText('Solved in 2 tries!')).toBeVisible()
	await expect(keypad).toHaveCount(0)

	await page.clock.setFixedTime(day2)
	await page.reload()
	await expect(page.getByRole('heading', { name: 'Guessle #2' })).toBeVisible()
	await guess(page, '18866')
	await expect(page.getByText('Got it in one!')).toBeVisible()
	await expect(page.getByRole('region', { name: 'Statistics' })).toContainText(
		/Played\s*2\s*Win %\s*100\s*Current streak\s*2\s*Max streak\s*2/,
	)
})

test('reveals the answer after six misses and offers Classic', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('heading', { name: 'Guessle #1' })).toBeVisible()
	await guess(page, '12')
	await expect(page.getByRole('alert')).toHaveText('Enter all 5 digits.')
	await page.keyboard.press('Backspace')
	await page.keyboard.press('Backspace')

	for (const digits of ['00000', '11111', '55555', '66666', '88888', '99999']) {
		await guess(page, digits)
	}

	await expect(page.getByText('So close! The number was 42273')).toBeVisible()
	await page.getByRole('button', { name: 'Play Classic' }).click()
	await expect(page.getByLabel('Guess', { exact: true })).toBeFocused()
	await expect(
		page.getByRole('group', { name: 'Single-player type' }).getByRole('button', { name: 'Classic' }),
	).toHaveAttribute('aria-pressed', 'true')
})

test('fits the board and keypad on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 740 })
	await page.goto('/')

	const main = page.getByRole('main')
	expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
	const keys = await page
		.getByRole('group', { name: 'Number keypad' })
		.getByRole('button')
		.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))
	expect(Math.min(...keys)).toBeGreaterThanOrEqual(44)
})

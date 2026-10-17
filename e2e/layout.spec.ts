import { test, expect, type Page } from '@playwright/test'

test.use({ timezoneId: 'Asia/Bangkok' })

test.beforeEach(async ({ page }) => {
	await page.clock.setFixedTime(new Date('2026-10-14T09:00:00+07:00'))
	await page.addInitScript(() => {
		Math.random = () => 0.5
	})
	await page.route('https://api.github.com/repos/PePoDev/guessle', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ stargazers_count: 128 }),
		})
	})
})

async function openGuessle(page: Page) {
	await page.goto('/')
	await expect(page.getByRole('heading', { name: 'Guessle #1' })).toBeVisible()
}

async function guess(page: Page, digits: string) {
	await page.keyboard.type(digits)
	await page.keyboard.press('Enter')
}

function pageOverflow(page: Page) {
	return page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight)
}

function panelOverflow(page: Page) {
	return page.getByRole('main').evaluate((panel) => panel.scrollHeight - panel.clientHeight)
}

async function sizes(page: Page, selector: string) {
	return page
		.locator(selector)
		.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height))
}

const viewports = [
	{ width: 1280, height: 720 },
	{ width: 1440, height: 900 },
	{ width: 2000, height: 861 },
	{ width: 1024, height: 768 },
	{ width: 820, height: 1180 },
	{ width: 390, height: 844 },
	{ width: 360, height: 740 },
]

for (const viewport of viewports) {
	test(`fits Guessle in play to a ${viewport.width} × ${viewport.height} window`, async ({ page }) => {
		await page.setViewportSize(viewport)
		await openGuessle(page)
		await guess(page, '12345')

		expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
		expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
		const keypad = page.getByRole('group', { name: 'Number keypad' })
		await expect(keypad.getByRole('button', { name: 'Enter' })).toBeInViewport({ ratio: 1 })
		expect(Math.min(...(await sizes(page, '.tile')))).toBeGreaterThanOrEqual(32)
		expect(
			Math.min(
				...(await keypad
					.getByRole('button')
					.evaluateAll((keys) => keys.map((key) => key.getBoundingClientRect().height))),
			),
		).toBeGreaterThanOrEqual(44)
	})
}

test('grows the tiles into a tall window and shrinks them in a short one', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 })
	await openGuessle(page)
	expect(Math.min(...(await sizes(page, '.tile')))).toBe(56)

	await page.setViewportSize({ width: 1280, height: 720 })
	await expect.poll(async () => Math.max(...(await sizes(page, '.tile')))).toBeLessThan(56)
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
})

test('shows only the rows played above the result without scrolling the page', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await openGuessle(page)
	await guess(page, '12345')
	await guess(page, '42273')

	await expect(page.getByText('Solved in 2 tries!')).toBeVisible()
	expect(await sizes(page, '.tile')).toHaveLength(10)
	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
	await expect(page.getByRole('timer')).toBeInViewport()
})

test('scrolls a long Classic history inside its box, not the page', async ({ page }) => {
	await page.setViewportSize({ width: 2000, height: 861 })
	await openGuessle(page)
	await page
		.getByRole('group', { name: 'Single-player type' })
		.getByRole('button', { name: 'Classic' })
		.click()
	const field = page.getByLabel('Guess', { exact: true })
	for (const digits of ['123', '456', '789', '012', '345', '678', '901']) {
		await field.fill(digits)
		await field.press('Enter')
	}

	await expect(page.getByText(/Game Over!/)).toBeVisible()
	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
	const history = page.getByText('Guess 1: 123').locator('xpath=../..')
	expect(await history.evaluate((list) => list.scrollHeight > list.clientHeight)).toBe(true)
})

test('scrolls the panel, never the page, when its content cannot fit', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 })
	await openGuessle(page)
	await page.getByRole('button', { name: /Instructions/ }).click()

	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
	expect(await panelOverflow(page)).toBeGreaterThan(0)
	await expect(page.getByRole('heading', { name: 'Playing with friends:' })).toBeAttached()
})

test('keeps the natural page flow on a phone held sideways', async ({ page }) => {
	await page.setViewportSize({ width: 844, height: 390 })
	await openGuessle(page)

	expect(await pageOverflow(page)).toBeGreaterThan(0)
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
	const enter = page.getByRole('group', { name: 'Number keypad' }).getByRole('button', { name: 'Enter' })
	await enter.scrollIntoViewIfNeeded()
	await expect(enter).toBeInViewport({ ratio: 1 })
})

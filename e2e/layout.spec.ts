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

test('floats a warning over the board without resizing it', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 })
	await openGuessle(page)
	await guess(page, '12345')
	const firstTile = page.locator('.tile').first()
	const before = await firstTile.boundingBox()

	await guess(page, '12')

	await expect(page.getByRole('alert')).toHaveText('Enter all 5 digits.')
	expect(await firstTile.boundingBox()).toEqual(before)
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
	await expect(page.getByText('Enter all 5 digits.')).toBeInViewport()
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

test('gives a finished Guessle at least as much room in a taller window', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 1000 })
	await openGuessle(page)
	for (const digits of ['00000', '11111', '55555', '66666', '88888', '99999']) {
		await guess(page, digits)
	}
	await expect(page.getByText(/So close!/)).toBeVisible()
	const shortTile = Math.min(...(await sizes(page, '.tile')))
	expect(await panelOverflow(page)).toBeLessThanOrEqual(0)

	for (const height of [1127, 1128, 1366]) {
		await page.setViewportSize({ width: 1024, height })
		await expect.poll(async () => Math.min(...(await sizes(page, '.tile')))).toBeGreaterThanOrEqual(shortTile)
		expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
		expect(await panelOverflow(page)).toBeLessThanOrEqual(0)
	}
})

test('keeps a failed share warning beside the result, not over the board', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: () => Promise.reject(new Error('blocked')) },
		})
	})
	await page.setViewportSize({ width: 1440, height: 900 })
	await openGuessle(page)
	await guess(page, '42273')
	await page.getByRole('button', { name: 'Share' }).click()

	const warning = page.getByText("Couldn't share your result.", { exact: false })
	await expect(warning).toBeVisible()
	const board = await page.getByRole('list', { name: 'Guesses' }).boundingBox()
	const box = await warning.boundingBox()
	expect(box!.y).toBeGreaterThanOrEqual(board!.y + board!.height)
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
	const history = page.getByRole('region', { name: 'Guess History:' })
	expect(
		await history.evaluate((section) => {
			const list = section.lastElementChild!
			return list.scrollHeight > list.clientHeight && list.clientHeight > 90
		}),
	).toBe(true)
	await expect(page.getByRole('heading', { name: 'Notepad' })).toHaveCount(0)
})

test('scrolls the panel, never the page, when its content cannot fit', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 })
	await openGuessle(page)
	await page.getByRole('button', { name: /Instructions/ }).click()

	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
	const lastStep = page.getByRole('main').getByRole('listitem').last()
	await expect(lastStep).not.toBeInViewport()
	await page.getByRole('main').hover()
	await page.mouse.wheel(0, 1000)
	await expect(lastStep).toBeInViewport()
	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
})

test('opens each screen at its top after the panel was scrolled', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 740 })
	await openGuessle(page)
	await page
		.getByRole('group', { name: 'Single-player type' })
		.getByRole('button', { name: 'Classic' })
		.click()
	await page.getByRole('main').evaluate((panel) => panel.scrollTo(0, panel.scrollHeight))
	expect(await page.getByRole('main').evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0)

	await page.getByRole('button', { name: /Instructions/ }).click()

	await expect(page.getByRole('heading', { name: 'How to Play:' })).toBeInViewport()
	expect(await page.getByRole('main').evaluate((panel) => panel.scrollTop)).toBe(0)
})

test('wraps the still ticker so every label shows when motion is reduced', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.setViewportSize({ width: 390, height: 844 })
	await openGuessle(page)

	const ticker = page.locator('.ticker-seq').first()
	await expect(ticker).toHaveCSS('white-space', 'normal')
	expect(await ticker.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
	expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
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

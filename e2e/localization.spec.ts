import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		Math.random = () => 0.5
	})
	await page.route(
		'https://api.github.com/repos/PePoDev/guessle',
		async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ stargazers_count: 128 }),
			})
		},
	)
})

test.describe('in a Thai browser', () => {
	test.use({ locale: 'th-TH' })

	test('opens in Thai and remembers English', async ({ page }) => {
		await page.goto('/')
		await page
			.getByRole('group', { name: 'รูปแบบการเล่นคนเดียว' })
			.getByRole('button', { name: 'สุ่ม' })
			.click()

		await expect(page.locator('html')).toHaveAttribute('lang', 'th')
		await expect(page).toHaveTitle('Guessle: เกมทายเลขรายวัน')
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Guessle.',
		)
		await page.keyboard.type('123')
		await page.keyboard.press('Enter')
		await expect(page.getByRole('list', { name: 'คำทาย' })).toContainText(
			'ครั้งที่ 1: 1 2 3 มีในคำตอบ 0 ตัว ถูกตำแหน่ง 0 ตัว',
		)

		await page
			.getByRole('button', { name: 'เปิดการตั้งค่าโหมดสุ่มเลข' })
			.click()
		await page.getByLabel('ภาษา:').selectOption('en')
		await page.getByRole('button', { name: 'Close', exact: true }).click()

		await expect(page.locator('html')).toHaveAttribute('lang', 'en')
		await expect(page.getByRole('list', { name: 'Guesses' })).toContainText(
			'Guess 1: 1 2 3, 0 in the number, 0 in the right spot',
		)

		await page.reload()

		await expect(page.locator('html')).toHaveAttribute('lang', 'en')
		await expect(page).toHaveTitle('Guessle: Daily Number Puzzle')
		await expect(
			page
				.getByRole('group', { name: 'Single-player type' })
				.getByRole('button', { name: 'Random' }),
		).toBeVisible()
	})

	test('plays local multiplayer setup in Thai', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('button', { name: /เล่นหลายคน/ }).click()

		await expect(page.getByText('ถึงตา ผู้เล่น 1 ตั้งค่า')).toBeVisible()
		await page.getByLabel('ชื่อ:').fill('อลิซ')
		await page.getByLabel('เลขลับ:').fill('123')
		await page.getByRole('button', { name: 'บันทึกและไปต่อ' }).click()

		await expect(page.getByText('ถึงตา ผู้เล่น 2 ตั้งค่า')).toBeVisible()
	})

	test('plays Guessle in Thai', async ({ page }) => {
		await page.clock.setFixedTime(new Date(2026, 9, 14, 9))
		await page.goto('/')

		await expect(
			page.getByRole('heading', { name: 'Guessle #1' }),
		).toBeVisible()
		await expect(page.getByText(/ของวันนี้/)).toHaveText(
			'ทายเลข 3 หลักของวันนี้ให้ถูกภายใน 6 ครั้ง ทุกคนได้เลขเดียวกัน',
		)
		await page.keyboard.type('12')
		await page.getByRole('button', { name: 'ส่ง' }).click()
		await expect(page.getByRole('alert')).toHaveText('กรอกให้ครบ 3 หลัก')
	})
})

test.describe('in an English browser', () => {
	test.use({ locale: 'en-GB' })

	test('opens in English', async ({ page }) => {
		await page.goto('/')

		await expect(page.locator('html')).toHaveAttribute('lang', 'en')
		await expect(page).toHaveTitle('Guessle: Daily Number Puzzle')
		await expect(
			page
				.getByRole('group', { name: 'Single-player type' })
				.getByRole('button', { name: 'Daily' }),
		).toHaveAttribute('aria-pressed', 'true')
	})
})

test.describe('in a browser with an unsupported language', () => {
	test.use({ locale: 'fr-FR' })

	test('opens in Thai and remembers English', async ({ page }) => {
		await page.goto('/')

		await expect(page.locator('html')).toHaveAttribute('lang', 'th')
		await expect(page).toHaveTitle('Guessle: เกมทายเลขรายวัน')
		await expect(
			page
				.getByRole('group', { name: 'รูปแบบการเล่นคนเดียว' })
				.getByRole('button', { name: 'รายวัน' }),
		).toHaveAttribute('aria-pressed', 'true')

		await page
			.getByRole('button', { name: 'เปิดการตั้งค่าโหมดเกม Guessle รายวัน' })
			.click()
		await page.getByLabel('ภาษา:').selectOption('en')
		await page.getByRole('button', { name: 'Close', exact: true }).click()
		await page.reload()

		await expect(page.locator('html')).toHaveAttribute('lang', 'en')
		await expect(page).toHaveTitle('Guessle: Daily Number Puzzle')
	})
})

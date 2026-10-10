import { test, expect } from '@playwright/test'

test.use({ locale: 'th-TH' })

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		Math.random = () => 0.5
	})
	await page.route(
		'https://api.github.com/repos/PePoDev/number-guesser',
		async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ stargazers_count: 128 }),
			})
		},
	)
})

test('opens in Thai for a Thai browser and remembers English', async ({
	page,
}) => {
	await page.goto('/')

	await expect(page.locator('html')).toHaveAttribute('lang', 'th')
	await expect(page).toHaveTitle('เกมทายตัวเลข')
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'เกมทาย ตัวเลข',
	)
	const input = page.getByLabel('คำทาย', { exact: true })
	await input.fill('123')
	await input.press('Enter')
	await expect(page.getByText('ครั้งที่ 1: 123')).toBeVisible()

	await page
		.getByRole('button', { name: 'เปิดการตั้งค่าโหมดเล่นคนเดียว' })
		.click()
	await page.getByLabel('ภาษา:').selectOption('en')
	await page.getByRole('button', { name: 'Close', exact: true }).click()

	await expect(page.locator('html')).toHaveAttribute('lang', 'en')
	await expect(page.getByText('Guess 1: 123')).toBeVisible()

	await page.reload()

	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Number Guessing Game.',
	)
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

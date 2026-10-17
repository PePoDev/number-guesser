import { test, expect } from '@playwright/test'

test.use({ locale: 'th-TH' })

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

test('opens in Thai for a Thai browser and remembers English', async ({
	page,
}) => {
	await page.goto('/')
	await page
		.getByRole('group', { name: 'รูปแบบการเล่นคนเดียว' })
		.getByRole('button', { name: 'คลาสสิก' })
		.click()

	await expect(page.locator('html')).toHaveAttribute('lang', 'th')
	await expect(page).toHaveTitle('Guessle: เกมทายเลขรายวัน')
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Guessle.',
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
		'Guessle.',
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

test('plays Guessle in Thai', async ({ page }) => {
	await page.clock.setFixedTime(new Date(2026, 9, 14, 9))
	await page.goto('/')

	await expect(page.getByRole('heading', { name: 'Guessle #1' })).toBeVisible()
	await expect(page.getByText(/ของวันนี้/)).toHaveText(
		'ทายเลข 5 หลักของวันนี้ให้ถูกภายใน 6 ครั้ง ทุกคนได้เลขเดียวกัน',
	)
	await page.keyboard.type('12')
	await page.getByRole('button', { name: 'ส่ง' }).click()
	await expect(page.getByRole('alert')).toHaveText('กรอกให้ครบ 5 หลัก')
})

import { expect, test } from '@playwright/test'

test('shows and copies the latest formatted annotation snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText(text: string) {
          window.copiedSnapshotJson = text
        },
      },
    })
  })
  await page.goto('/demo/')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  await page.evaluate(() => {
    window.demoTest.addRect('person', {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })
  })

  await page.getByRole('button', { name: '获取结果' }).click()
  const dialog = page.getByRole('dialog', { name: '标注结果 JSON' })
  await expect(dialog).toBeVisible()

  const displayed = await dialog.locator('#snapshot-json').textContent()
  const snapshot = await page.evaluate(() => window.demoTest.snapshot())
  expect(JSON.parse(displayed ?? '')).toEqual(snapshot)
  expect(displayed).toContain('\n  "annotations": [')

  await dialog.getByRole('button', { name: '复制 JSON' }).click()
  expect(await page.evaluate(() => window.copiedSnapshotJson)).toBe(displayed)
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

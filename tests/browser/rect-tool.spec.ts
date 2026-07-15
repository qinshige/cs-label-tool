import { expect, test } from '@playwright/test'

test('finishes and clips a rectangle after the pointer leaves the viewport', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/tools.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  await page.getByRole('button', { name: 'Rectangle' }).click()

  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) {
    return
  }

  await page.mouse.move(bounds.x + 300, bounds.y + 250)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 900, bounds.y + 500)
  await page.mouse.up()

  const annotations = await page.evaluate(() => window.getTestSnapshot().annotations)
  expect(annotations).toHaveLength(1)
  const annotation = annotations[0]
  expect(annotation).toBeDefined()
  if (annotation === undefined || annotation.geometry.type !== 'rect') {
    throw new Error('Expected one rectangle annotation')
  }
  const geometry = annotation.geometry
  expect(geometry.x).toBeGreaterThanOrEqual(0)
  expect(geometry.y).toBeGreaterThanOrEqual(0)
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(1200)
  expect(geometry.y + geometry.height).toBeLessThanOrEqual(800)
})

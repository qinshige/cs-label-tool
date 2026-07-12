import { expect, test } from '@playwright/test'

test('mounts an accessible default UI and activates tools with one click', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/component.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  expect(await page.evaluate(() => window.controlsDisabledBeforeImage)).toBe(true)
  const editor = page.locator('cs-annotator')

  await expect(editor.getByRole('toolbar', { name: 'Annotation tools' }))
    .toBeVisible()
  const rectangle = editor.getByRole('button', { name: 'Rectangle' })
  await rectangle.click()
  await expect(rectangle).toHaveAttribute('aria-pressed', 'true')
  const brush = editor.getByRole('button', { name: 'Brush' })
  await brush.click()
  await expect(brush).toHaveAttribute('aria-pressed', 'true')
  const eraser = editor.getByRole('button', { name: 'Eraser' })
  await eraser.click()
  await expect(eraser).toHaveAttribute('aria-pressed', 'true')
  await expect(editor.locator('canvas[data-layer="event"]')).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Undo' })).toBeVisible()
  const zoomBefore = await page.evaluate(() => window.getTestZoom())
  await editor.getByRole('button', { name: 'Zoom in' }).click()
  expect(await page.evaluate(() => window.getTestZoom())).toBeGreaterThan(zoomBefore)
})

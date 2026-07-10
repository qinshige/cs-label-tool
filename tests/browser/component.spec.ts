import { expect, test } from '@playwright/test'

test('mounts an accessible default UI and activates tools with one click', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/component.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  const editor = page.locator('cs-annotator')

  await expect(editor.getByRole('toolbar', { name: 'Annotation tools' }))
    .toBeVisible()
  const rectangle = editor.getByRole('button', { name: 'Rectangle' })
  await rectangle.click()
  await expect(rectangle).toHaveAttribute('aria-pressed', 'true')
  await expect(editor.locator('canvas[data-layer="event"]')).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Undo' })).toBeVisible()
})

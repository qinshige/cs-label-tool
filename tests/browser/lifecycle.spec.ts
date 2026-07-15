import { expect, test } from '@playwright/test'

test('destroys an active tool and removes rendered resources on unmount', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  page.on('pageerror', error => pageErrors.push(error))
  await page.goto('/tests/fixtures/component.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  await page.locator('cs-annotator').getByRole('button', { name: 'Rectangle' }).click()

  const result = await page.evaluate(() => {
    const annotator = window.testAnnotator
    window.unmountTestAnnotator()
    let destroyed = false
    try {
      window.getTestSnapshot(annotator)
    } catch (error) {
      destroyed = error instanceof Error && /destroyed/i.test(error.message)
    }
    return { destroyed }
  })

  await expect(page.locator('cs-annotator')).toHaveCount(0)
  await expect(page.locator('canvas[data-layer]')).toHaveCount(0)
  expect(result.destroyed).toBe(true)
  expect(pageErrors).toEqual([])
})

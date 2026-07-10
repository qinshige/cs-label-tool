import { expect, test } from '@playwright/test'

test('uses viewport-sized DPR canvases and renders a fitted image', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/renderer.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const layers = page.locator('canvas[data-layer]')
  await expect(layers).toHaveCount(4)

  const result = await page
    .locator('canvas[data-layer="annotations"]')
    .evaluate(element => {
      const canvas = element as HTMLCanvasElement
      return {
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        width: canvas.width,
        height: canvas.height,
      }
    })
  expect(result).toEqual({
    cssWidth: 800,
    cssHeight: 600,
    width: 1600,
    height: 1200,
  })

  const centerPixel = await page
    .locator('canvas[data-layer="image"]')
    .evaluate(element => {
      const canvas = element as HTMLCanvasElement
      const context = canvas.getContext('2d')
      if (context === null) {
        throw new Error('2D context is unavailable')
      }
      return [...context.getImageData(800, 600, 1, 1).data]
    })
  expect(centerPixel).toEqual([255, 255, 255, 255])
})

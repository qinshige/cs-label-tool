import { expect, test, type Page } from '@playwright/test'

async function dragImagePoint(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const points = await page.evaluate(
    ({ start, end }) => ({
      start: window.vectorTest.pointToClient(start),
      end: window.vectorTest.pointToClient(end),
    }),
    { start, end },
  )
  await page.mouse.move(points.start.x, points.start.y)
  await page.mouse.down()
  await page.mouse.move(points.end.x, points.end.y)
  await page.mouse.up()
}

test('creates polygons and edits vectors in original-image coordinates', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/vector-editing.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  const ids = await page.evaluate(() => window.vectorTest.ids)

  await page.getByRole('button', { name: 'Polygon' }).click()
  for (const point of [
    { x: 800, y: 100 },
    { x: 900, y: 100 },
    { x: 850, y: 220 },
  ]) {
    const client = await page.evaluate(
      point => window.vectorTest.pointToClient(point),
      point,
    )
    await page.mouse.click(client.x, client.y)
  }
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => window.vectorTest.snapshot().annotations.length))
    .toBe(3)

  await page.getByRole('button', { name: 'Select' }).click()
  await dragImagePoint(page, { x: 200, y: 175 }, { x: 250, y: 205 })
  let snapshot = await page.evaluate(() => window.vectorTest.snapshot())
  let rect = snapshot.annotations.find(
    annotation => annotation.id === ids.rectId,
  )
  if (rect?.geometry.type !== 'rect') {
    throw new Error('Expected the rectangle annotation')
  }
  expect(rect.geometry.x).toBeCloseTo(150, 4)
  expect(rect.geometry.y).toBeCloseTo(130, 4)
  expect(rect.geometry.width).toBe(200)
  expect(rect.geometry.height).toBe(150)

  await page.evaluate(() => window.vectorTest.undo())
  snapshot = await page.evaluate(() => window.vectorTest.snapshot())
  rect = snapshot.annotations.find(annotation => annotation.id === ids.rectId)
  expect(rect?.geometry).toEqual({
    type: 'rect', x: 100, y: 100, width: 200, height: 150,
  })
  await page.evaluate(() => window.vectorTest.redo())

  const polygonCenter = await page.evaluate(() =>
    window.vectorTest.pointToClient({ x: 550, y: 150 }),
  )
  await page.mouse.click(polygonCenter.x, polygonCenter.y)
  expect(await page.evaluate(() => window.vectorTest.selection())).toEqual([
    ids.polygonId,
  ])
  const polygonVertex = await page.evaluate(() =>
    window.vectorTest.pointToClient({ x: 500, y: 100 }),
  )
  const handleAlpha = await page
    .locator('canvas[data-layer="interaction"]')
    .evaluate((element, point) => {
      const canvas = element as HTMLCanvasElement
      const context = canvas.getContext('2d')
      if (context === null) {
        throw new Error('2D context is unavailable')
      }
      const bounds = canvas.getBoundingClientRect()
      const dpr = canvas.width / bounds.width
      return context.getImageData(
        Math.round((point.x - bounds.left) * dpr),
        Math.round((point.y - bounds.top) * dpr),
        1,
        1,
      ).data[3]
    }, polygonVertex)
  expect(handleAlpha).toBeGreaterThan(0)
  await dragImagePoint(page, { x: 500, y: 100 }, { x: 480, y: 80 })

  snapshot = await page.evaluate(() => window.vectorTest.snapshot())
  const polygon = snapshot.annotations.find(
    annotation => annotation.id === ids.polygonId,
  )
  if (polygon?.geometry.type !== 'polygon') {
    throw new Error('Expected the polygon annotation')
  }
  expect(polygon.geometry.points[0]?.[0]).toBeCloseTo(480, 4)
  expect(polygon.geometry.points[0]?.[1]).toBeCloseTo(80, 4)
  expect(polygon.geometry.points.slice(1)).toEqual([[600, 100], [550, 220]])

  await page.evaluate(() => window.vectorTest.zoom(2.5))
  expect(await page.evaluate(() => window.vectorTest.snapshot().annotations))
    .toEqual(snapshot.annotations)
})

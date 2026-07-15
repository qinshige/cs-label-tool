import { expect, test } from '@playwright/test'

test('demo loads a.webp and exposes the full annotation workbench', async ({
  page,
}) => {
  const pageErrors: Error[] = []
  page.on('pageerror', error => pageErrors.push(error))

  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  await expect(page.locator('canvas[data-layer="image"]')).toBeVisible()
  const tools = await page.locator('#tool-list button').allTextContents()
  expect(tools.join(' ')).toContain('矩形')
  expect(tools.join(' ')).toContain('多边形')
  expect(tools.join(' ')).toContain('涂抹')
  expect(tools.join(' ')).toContain('橡皮擦')
  expect(await page.locator('#label-selection button').count()).toBe(5)
  expect(await page.evaluate(() => window.demoTest.hasImagePixels()))
    .toBe(true)
  expect(pageErrors).toEqual([])
})

test('demo brush creates a mask and eraser subtracts only mask pixels', async ({
  page,
}) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  await page.locator('button[data-tool-id="brush"]').click()
  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) {
    return
  }
  const start = { x: bounds.x + bounds.width / 2 - 20, y: bounds.y + bounds.height / 2 }
  const end = { x: bounds.x + bounds.width / 2 + 20, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  expect(await page.evaluate(() => window.demoTest.snapshot().annotations[0]?.geometry.type))
    .toBe('mask')
  const beforePixels = await page.evaluate(() => {
    const annotation = window.demoTest.snapshot().annotations[0]
    if (annotation?.geometry.type !== 'mask') {
      return 0
    }
    return annotation.geometry.rle
      .filter((_, index) => index % 2 === 1)
      .reduce((sum, run) => sum + run, 0)
  })

  await page.evaluate(() =>
    window.demoTest.addRect('person', {
      x: 10,
      y: 10,
      width: 120,
      height: 90,
    }),
  )

  await page.locator('button[data-tool-id="eraser"]').click()
  await page.mouse.move(start.x + 10, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x - 10, end.y)
  await page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ))
  const previewAlpha = await page.evaluate(({ x, y }) => {
    const root = document.querySelector('#annotator')?.shadowRoot
    const alphaAt = (layer: string) => {
      const canvas = root?.querySelector<HTMLCanvasElement>(
        `canvas[data-layer="${layer}"]`,
      )
      if (canvas == null) return -1
      const bounds = canvas.getBoundingClientRect()
      const pixelX = Math.round((x - bounds.x) * canvas.width / bounds.width)
      const pixelY = Math.round((y - bounds.y) * canvas.height / bounds.height)
      return canvas.getContext('2d')?.getImageData(pixelX, pixelY, 1, 1).data[3] ?? -1
    }
    return {
      annotations: alphaAt('annotations'),
      interaction: alphaAt('interaction'),
    }
  }, { x: start.x + 15, y: start.y })
  expect(previewAlpha).toEqual({ annotations: 0, interaction: 0 })
  await page.mouse.up()

  const after = await page.evaluate(() => {
    const annotations = window.demoTest.snapshot().annotations
    const mask = annotations.find(annotation => annotation.geometry.type === 'mask')
    const maskPixels = mask?.geometry.type === 'mask'
      ? mask.geometry.rle
        .filter((_, index) => index % 2 === 1)
        .reduce((sum, run) => sum + run, 0)
      : 0
    return {
      types: annotations.map(annotation => annotation.geometry.type),
      maskPixels,
    }
  })
  expect(after.types).toEqual(['mask', 'rect'])
  expect(after.maskPixels).toBeLessThan(beforePixels)
})

test('demo brush size control changes stroke thickness', async ({ page }) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  await page.locator('button[data-tool-id="brush"]').click()
  const size = page.locator('#brush-size')
  await expect(size).toBeVisible()
  await size.fill('6')
  await expect(page.locator('#brush-size-value')).toHaveText('6 px')

  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) return

  const draw = async (y: number) => {
    await page.mouse.move(bounds.x + bounds.width / 2 - 30, y)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 30, y)
    await page.mouse.up()
  }
  await draw(bounds.y + bounds.height / 2 - 60)

  await size.fill('30')
  await expect(page.locator('#brush-size-value')).toHaveText('30 px')
  await draw(bounds.y + bounds.height / 2 + 60)

  const pixelCounts = await page.evaluate(() =>
    window.demoTest.snapshot().annotations
      .filter(annotation => annotation.geometry.type === 'mask')
      .map(annotation => annotation.geometry.type === 'mask'
        ? annotation.geometry.rle
          .filter((_, index) => index % 2 === 1)
          .reduce((sum, run) => sum + run, 0)
        : 0),
  )
  expect(pixelCounts).toHaveLength(2)
  expect(pixelCounts[1]).toBeGreaterThan(pixelCounts[0]! * 2)
})

test('demo splits an erased mask into independently selectable regions', async ({
  page,
}) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  await page.locator('button[data-tool-id="brush"]').click()
  await page.locator('#brush-size').fill('24')
  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) return

  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(center.x - 90, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 90, center.y)
  await page.mouse.up()

  await page.locator('button[data-tool-id="eraser"]').click()
  await page.mouse.move(center.x, center.y - 50)
  await page.mouse.down()
  await page.mouse.move(center.x, center.y + 50)
  await page.mouse.up()

  expect(await page.evaluate(() =>
    window.demoTest.snapshot().annotations.filter(
      annotation => annotation.geometry.type === 'mask',
    ).length,
  )).toBe(2)

  await page.locator('button[data-tool-id="select"]').click()
  await page.mouse.click(center.x - 55, center.y)
  const leftId = await page.evaluate(() => window.demoTest.selection()[0])
  await page.mouse.click(center.x + 55, center.y)
  const rightId = await page.evaluate(() => window.demoTest.selection()[0])
  expect(leftId).toBeDefined()
  expect(rightId).toBeDefined()
  expect(rightId).not.toBe(leftId)

  await page.mouse.move(center.x + 55, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 42, center.y)
  await page.mouse.up()
  expect(await page.evaluate(() =>
    window.demoTest.snapshot().annotations.filter(
      annotation => annotation.geometry.type === 'mask',
    ).length,
  )).toBe(1)
})

test('demo supports rectangle editing and viewport dragging', async ({ page }) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) {
    return
  }

  await page.locator('button[data-tool-id="rect"]').click()
  const start = { x: bounds.x + bounds.width / 2 - 80, y: bounds.y + bounds.height / 2 - 50 }
  const end = { x: bounds.x + bounds.width / 2 + 80, y: bounds.y + bounds.height / 2 + 50 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  const created = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(created?.geometry.type).toBe('rect')

  await page.locator('button[data-tool-id="select"]').click()
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 32, center.y + 24)
  await page.mouse.up()

  const moved = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(moved?.geometry.type).toBe('rect')
  if (created?.geometry.type !== 'rect' || moved?.geometry.type !== 'rect') {
    return
  }
  expect(moved.geometry.x).toBeGreaterThan(created.geometry.x)
  expect(moved.geometry.y).toBeGreaterThan(created.geometry.y)
  expect(moved.geometry.width).toBeCloseTo(created.geometry.width, 1)
  expect(moved.geometry.height).toBeCloseTo(created.geometry.height, 1)

  await page.mouse.move(end.x + 32, end.y + 24)
  await page.mouse.down()
  await page.mouse.move(end.x + 62, end.y + 44)
  await page.mouse.up()

  const resized = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(resized?.geometry.type).toBe('rect')
  if (resized?.geometry.type !== 'rect') {
    return
  }
  expect(resized.geometry.width).toBeGreaterThan(moved.geometry.width)
  expect(resized.geometry.height).toBeGreaterThan(moved.geometry.height)

  const beforePan = await page.evaluate(() => window.demoTest.imageToClient({ x: 0, y: 0 }))
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.keyboard.down('Alt')
  await page.mouse.down({ button: 'left' })
  await page.mouse.move(bounds.x + bounds.width / 2 + 50, bounds.y + bounds.height / 2 + 20)
  await page.mouse.up({ button: 'left' })
  await page.keyboard.up('Alt')
  const afterPan = await page.evaluate(() => window.demoTest.imageToClient({ x: 0, y: 0 }))

  expect(afterPan.x).toBeGreaterThan(beforePan.x)
  expect(afterPan.y).toBeGreaterThan(beforePan.y)
})

test('space-pan and zoom keep drawing and editing aligned', async ({ page }) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) return

  const originBefore = await page.evaluate(() =>
    window.demoTest.imageToClient({ x: 0, y: 0 }),
  )
  await page.locator('button[data-tool-id="rect"]').click()
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.keyboard.down('Space')
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 35)
  await page.mouse.up()
  await page.keyboard.up('Space')

  expect(await page.evaluate(() => window.demoTest.snapshot().annotations))
    .toHaveLength(0)
  const originAfter = await page.evaluate(() =>
    window.demoTest.imageToClient({ x: 0, y: 0 }),
  )
  expect(originAfter.x - originBefore.x).toBeCloseTo(60, 0)
  expect(originAfter.y - originBefore.y).toBeCloseTo(35, 0)

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.wheel(0, -600)
  const start = { x: bounds.x + bounds.width / 2 - 70, y: bounds.y + bounds.height / 2 - 45 }
  const end = { x: bounds.x + bounds.width / 2 + 70, y: bounds.y + bounds.height / 2 + 45 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  const rect = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(rect?.geometry.type).toBe('rect')
  if (rect?.geometry.type !== 'rect') return

  await page.locator('button[data-tool-id="select"]').click()
  await page.mouse.click((start.x + end.x) / 2, (start.y + end.y) / 2)
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([rect.id])

  await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2)
  await page.mouse.down()
  await page.mouse.move((start.x + end.x) / 2 + 30, (start.y + end.y) / 2 + 20)
  await page.mouse.up()
  const moved = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(moved?.geometry.type).toBe('rect')
  if (moved?.geometry.type !== 'rect') return
  expect(moved.geometry.x).toBeGreaterThan(rect.geometry.x)
  expect(moved.geometry.y).toBeGreaterThan(rect.geometry.y)
})

test('demo resizes a selected rectangle by dragging its border', async ({
  page,
}) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const canvas = page.locator('canvas[data-layer="event"]')
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds === null) {
    return
  }

  await page.locator('button[data-tool-id="rect"]').click()
  const start = { x: bounds.x + bounds.width / 2 - 90, y: bounds.y + bounds.height / 2 - 60 }
  const end = { x: bounds.x + bounds.width / 2 + 90, y: bounds.y + bounds.height / 2 + 60 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  await page.locator('button[data-tool-id="select"]').click()
  await page.mouse.click((start.x + end.x) / 2, (start.y + end.y) / 2)
  const before = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(before?.geometry.type).toBe('rect')
  if (before?.geometry.type !== 'rect') {
    return
  }

  const rightBorderAwayFromHandle = {
    x: end.x,
    y: start.y + 28,
  }
  await page.mouse.move(rightBorderAwayFromHandle.x, rightBorderAwayFromHandle.y)
  await page.mouse.down()
  await page.mouse.move(rightBorderAwayFromHandle.x + 44, rightBorderAwayFromHandle.y)
  await page.mouse.up()

  const after = await page.evaluate(() => window.demoTest.snapshot().annotations[0])
  expect(after?.geometry.type).toBe('rect')
  if (after?.geometry.type !== 'rect') {
    return
  }
  expect(after.geometry.width).toBeGreaterThan(before.geometry.width)
  expect(after.geometry.x).toBeCloseTo(before.geometry.x, 1)
})

test('demo cycles through overlapping annotations on repeated selection clicks', async ({
  page,
}) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const ids = await page.evaluate(() => {
    const first = window.demoTest.addRect('person', {
      x: 100,
      y: 100,
      width: 160,
      height: 120,
    })
    const second = window.demoTest.addRect('vehicle', {
      x: 130,
      y: 120,
      width: 160,
      height: 120,
    })
    return { first, second }
  })
  const point = await page.evaluate(() =>
    window.demoTest.imageToClient({ x: 150, y: 140 }),
  )

  await page.locator('button[data-tool-id="select"]').click()
  await page.mouse.click(point.x, point.y)
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([
    ids.second,
  ])
  await expect(page.locator('#selected-info')).toContainText('车辆')

  await page.mouse.click(point.x, point.y)
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([
    ids.first,
  ])
  await expect(page.locator('#selected-info')).toContainText('人物')

  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + 28, point.y + 18)
  await page.mouse.up()
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([
    ids.first,
  ])
  await expect(page.locator('#selected-info')).toContainText('人物')
})

test('demo clears selection when switching back to drawing tools', async ({
  page,
}) => {
  await page.goto('/demo/index.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const id = await page.evaluate(() =>
    window.demoTest.addRect('person', {
      x: 100,
      y: 100,
      width: 160,
      height: 120,
    }),
  )
  const point = await page.evaluate(() =>
    window.demoTest.imageToClient({ x: 150, y: 140 }),
  )

  await page.locator('button[data-tool-id="select"]').click()
  await page.mouse.click(point.x, point.y)
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([id])
  await expect(page.locator('#selected-info')).toContainText('人物')

  await page.locator('button[data-tool-id="rect"]').click()
  expect(await page.evaluate(() => window.demoTest.selection())).toEqual([])
  await expect(page.locator('#selected-info')).toContainText('未选择标注')
})

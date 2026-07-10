import { describe, expect, test } from 'vitest'

import {
  createViewport,
  fitViewport,
  imageToScreen,
  panViewport,
  screenToImage,
  zoomAt,
} from '../../src/index.js'

describe('viewport transforms', () => {
  test('round-trips original coordinates after pointer-centered zoom', () => {
    const initial = createViewport({ width: 1200, height: 800 })
    const anchor = { x: 600, y: 400 }
    const zoomed = zoomAt(initial, anchor, 3.25)
    const imagePoint = { x: 18234.5, y: 9601.25 }

    const restored = screenToImage(zoomed, imageToScreen(zoomed, imagePoint))

    expect(restored.x).toBeCloseTo(imagePoint.x, 10)
    expect(restored.y).toBeCloseTo(imagePoint.y, 10)
    expect(screenToImage(initial, anchor)).toEqual(screenToImage(zoomed, anchor))
  })

  test('pans by screen-space deltas without mutating input', () => {
    const initial = createViewport({ width: 800, height: 600 })
    const panned = panViewport(initial, { x: 25, y: -10 })

    expect(panned).toMatchObject({ offsetX: 25, offsetY: -10 })
    expect(initial).toMatchObject({ offsetX: 0, offsetY: 0 })
  })

  test('fits and centers an image without changing its aspect ratio', () => {
    const initial = createViewport({ width: 1000, height: 800 })
    const fitted = fitViewport(initial, { width: 2000, height: 1000 })

    expect(fitted).toMatchObject({ scale: 0.5, offsetX: 0, offsetY: 150 })
    expect(imageToScreen(fitted, { x: 2000, y: 1000 })).toEqual({
      x: 1000,
      y: 650,
    })
  })

  test('rejects non-positive viewport dimensions', () => {
    expect(() => createViewport({ width: 0, height: 600 })).toThrowError(
      /positive/i,
    )
  })
})

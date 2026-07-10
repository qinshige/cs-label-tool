import { describe, expect, test } from 'vitest'

import {
  normalizeRect,
  pointInPolygon,
  pointInRect,
  validatePolygon,
} from '../../src/index.js'

describe('rectangle geometry', () => {
  test('normalizes rectangles drawn in reverse', () => {
    expect(normalizeRect({ x: 100, y: 80 }, { x: 20, y: 30 })).toEqual({
      x: 20,
      y: 30,
      width: 80,
      height: 50,
    })
  })

  test('includes rectangle boundaries in hit testing', () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 }
    expect(pointInRect({ x: 10, y: 20 }, rect)).toBe(true)
    expect(pointInRect({ x: 40, y: 60 }, rect)).toBe(true)
    expect(pointInRect({ x: 40.01, y: 60 }, rect)).toBe(false)
  })
})

describe('polygon geometry', () => {
  const triangle = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 100 },
  ]

  test('detects points inside a simple polygon', () => {
    expect(pointInPolygon({ x: 50, y: 30 }, triangle)).toBe(true)
    expect(pointInPolygon({ x: 90, y: 90 }, triangle)).toBe(false)
  })

  test('rejects polygons with fewer than three unique points', () => {
    expect(validatePolygon([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toEqual({
      valid: false,
      reason: 'TOO_FEW_POINTS',
    })
  })

  test('accepts three finite unique points', () => {
    expect(validatePolygon(triangle)).toEqual({ valid: true })
  })
})

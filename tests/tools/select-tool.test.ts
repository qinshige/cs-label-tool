import { describe, expect, test } from 'vitest'

import {
  getRectResizeHandleAtPoint,
  movePolygonVertex,
  moveRect,
  resizeRect,
  removePolygonVertex,
} from '../../src/tools/select-tool.js'

describe('vector editing geometry', () => {
  test('moves rectangle geometry in original-image coordinates', () => {
    expect(moveRect(
      { type: 'rect', x: 10, y: 20, width: 30, height: 40 },
      { x: 5, y: -2 },
    )).toEqual({ type: 'rect', x: 15, y: 18, width: 30, height: 40 })
  })

  test('moves one polygon vertex without changing other points', () => {
    expect(movePolygonVertex(
      { type: 'polygon', points: [[0, 0], [10, 0], [0, 10]] },
      1,
      { x: 12, y: 3 },
    )).toEqual({ type: 'polygon', points: [[0, 0], [12, 3], [0, 10]] })
  })

  test('resizes a rectangle from the north-west handle', () => {
    expect(resizeRect(
      { type: 'rect', x: 10, y: 20, width: 30, height: 40 },
      'north-west',
      { x: 5, y: 15 },
    )).toEqual({ type: 'rect', x: 5, y: 15, width: 35, height: 45 })
  })

  test('detects rectangle edges as resize handles', () => {
    const rect = { type: 'rect' as const, x: 10, y: 20, width: 100, height: 80 }

    expect(getRectResizeHandleAtPoint(rect, { x: 110, y: 45 }, 4)).toBe('east')
    expect(getRectResizeHandleAtPoint(rect, { x: 45, y: 20 }, 4)).toBe('north')
    expect(getRectResizeHandleAtPoint(rect, { x: 10, y: 100 }, 4)).toBe('south-west')
    expect(getRectResizeHandleAtPoint(rect, { x: 60, y: 60 }, 4)).toBeNull()
  })

  test('removes a polygon vertex only when three valid points remain', () => {
    expect(removePolygonVertex(
      { type: 'polygon', points: [[0, 0], [20, 0], [20, 20], [0, 20]] },
      1,
    )).toEqual({ type: 'polygon', points: [[0, 0], [20, 20], [0, 20]] })
    expect(removePolygonVertex(
      { type: 'polygon', points: [[0, 0], [20, 0], [0, 20]] },
      1,
    )).toBeNull()
  })
})

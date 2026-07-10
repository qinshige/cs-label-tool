import { describe, expect, test } from 'vitest'

import {
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

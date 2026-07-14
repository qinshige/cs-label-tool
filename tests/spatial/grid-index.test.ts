import { describe, expect, test } from 'vitest'

import {
  createGridIndex,
  insertSpatialItem,
  querySpatialBounds,
  removeSpatialItem,
  updateSpatialItem,
} from '../../src/spatial/grid-index.js'

describe('original-coordinate grid index', () => {
  test('returns only items intersecting queried cells', () => {
    let index = createGridIndex(256)
    index = insertSpatialItem(index, 'visible', {
      x: 20,
      y: 20,
      width: 40,
      height: 40,
    })
    index = insertSpatialItem(index, 'far', {
      x: 20_000,
      y: 20_000,
      width: 40,
      height: 40,
    })

    expect(querySpatialBounds(index, {
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    })).toEqual(['visible'])
  })

  test('deduplicates items spanning multiple cells', () => {
    let index = createGridIndex(100)
    index = insertSpatialItem(index, 'large', {
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    })

    expect(querySpatialBounds(index, {
      x: 50,
      y: 50,
      width: 300,
      height: 300,
    })).toEqual(['large'])
  })

  test('updates and removes occupied cells', () => {
    let index = createGridIndex(100)
    index = insertSpatialItem(index, 'item', {
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    })
    index = updateSpatialItem(index, 'item', {
      x: 1000,
      y: 1000,
      width: 20,
      height: 20,
    })

    expect(querySpatialBounds(index, { x: 0, y: 0, width: 50, height: 50 }))
      .toEqual([])
    expect(querySpatialBounds(index, {
      x: 990,
      y: 990,
      width: 50,
      height: 50,
    })).toEqual(['item'])

    index = removeSpatialItem(index, 'item')
    expect(querySpatialBounds(index, {
      x: 990,
      y: 990,
      width: 50,
      height: 50,
    })).toEqual([])
  })
})

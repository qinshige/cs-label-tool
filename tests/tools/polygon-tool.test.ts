import { describe, expect, test } from 'vitest'

import {
  createPolygonToolState,
  reducePolygonTool,
} from '../../src/tools/polygon-tool.js'

describe('polygon tool state machine', () => {
  test('commits three unique points and resets', () => {
    let state = createPolygonToolState()
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 0, y: 0 },
    }).state
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 100, y: 0 },
    }).state
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 50, y: 100 },
    }).state
    const result = reducePolygonTool(state, { type: 'commit' })

    expect(result.commit).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ])
    expect(result.state.points).toEqual([])
  })

  test('ignores duplicate consecutive points and removes the last point', () => {
    let state = createPolygonToolState()
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 10, y: 10 },
    }).state
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 10, y: 10 },
    }).state
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 20, y: 10 },
    }).state

    expect(reducePolygonTool(state, { type: 'remove-last' }).state.points)
      .toEqual([{ x: 10, y: 10 }])
  })

  test('does not commit an invalid polygon', () => {
    let state = createPolygonToolState()
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 0, y: 0 },
    }).state
    state = reducePolygonTool(state, {
      type: 'point',
      imagePoint: { x: 10, y: 0 },
    }).state

    expect(reducePolygonTool(state, { type: 'commit' }).commit).toBeUndefined()
  })
})

import { describe, expect, test } from 'vitest'

import {
  createRectToolState,
  reduceRectTool,
} from '../../src/tools/rect-tool.js'

describe('rectangle tool state machine', () => {
  test('creates a normalized rectangle from an up-left drag', () => {
    let state = createRectToolState()
    state = reduceRectTool(state, {
      type: 'down',
      imagePoint: { x: 100, y: 80 },
      pointerId: 1,
    }).state
    state = reduceRectTool(state, {
      type: 'move',
      imagePoint: { x: 20, y: 30 },
      pointerId: 1,
    }).state
    const result = reduceRectTool(state, {
      type: 'up',
      imagePoint: { x: 20, y: 30 },
      pointerId: 1,
    })

    expect(result.commit).toEqual({
      x: 20,
      y: 30,
      width: 80,
      height: 50,
    })
    expect(result.state.phase).toBe('idle')
  })

  test('ignores unrelated pointers and rectangles below minimum size', () => {
    let state = createRectToolState()
    state = reduceRectTool(state, {
      type: 'down',
      imagePoint: { x: 10, y: 10 },
      pointerId: 1,
    }).state
    const unrelated = reduceRectTool(state, {
      type: 'move',
      imagePoint: { x: 100, y: 100 },
      pointerId: 2,
    })
    const tiny = reduceRectTool(unrelated.state, {
      type: 'up',
      imagePoint: { x: 10.5, y: 10.5 },
      pointerId: 1,
    }, 1)

    expect(unrelated.state).toBe(state)
    expect(tiny.commit).toBeUndefined()
    expect(tiny.state.phase).toBe('idle')
  })

  test('cancels an in-progress rectangle', () => {
    const drawing = reduceRectTool(createRectToolState(), {
      type: 'down',
      imagePoint: { x: 10, y: 10 },
      pointerId: 1,
    }).state

    const result = reduceRectTool(drawing, { type: 'cancel' })

    expect(result).toEqual({ state: { phase: 'idle' } })
  })
})

import { expect, test, vi } from 'vitest'

import { createRenderScheduler } from '../../src/render/scheduler.js'

test('coalesces repeated invalidations into one frame', () => {
  let queued: FrameRequestCallback | undefined
  const render = vi.fn()
  const scheduler = createRenderScheduler({
    requestFrame: callback => {
      queued = callback
      return 1
    },
    cancelFrame: () => undefined,
    render,
  })

  scheduler.invalidate('annotations')
  scheduler.invalidate('interaction')
  expect(render).not.toHaveBeenCalled()
  queued?.(16)
  expect(render).toHaveBeenCalledTimes(1)
  expect(render).toHaveBeenCalledWith(
    new Set(['annotations', 'interaction']),
  )
})

test('cancels a pending frame when destroyed', () => {
  const cancelFrame = vi.fn()
  const scheduler = createRenderScheduler({
    requestFrame: () => 7,
    cancelFrame,
    render: () => undefined,
  })

  scheduler.invalidate('image')
  scheduler.destroy()
  scheduler.destroy()

  expect(cancelFrame).toHaveBeenCalledOnce()
  expect(cancelFrame).toHaveBeenCalledWith(7)
})

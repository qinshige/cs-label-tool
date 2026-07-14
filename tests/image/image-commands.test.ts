import { expect, test, vi } from 'vitest'

import {
  createAnnotator,
  fitToScreen,
  panBy,
  setImageSource,
  zoomTo,
} from '../../src/index.js'
import { getInternalState } from '../../src/core/annotator.js'
import { createViewport } from '../../src/viewport/viewport.js'
import type { ImageSource } from '../../src/image/types.js'

test('clears the old rendered image before disposing it during a source change', async () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  const state = getInternalState(annotator)
  const oldSource = { id: 'old', load: vi.fn(), dispose: vi.fn() }
  state.imageSource = oldSource
  state.image = {
    source: {} as CanvasImageSource,
    width: 100,
    height: 50,
  }
  state.viewport = createViewport({ width: 100, height: 50 })
  let rejectLoad: ((error: Error) => void) | undefined
  const nextSource: ImageSource = {
    id: 'next',
    load: vi.fn(() => new Promise<never>((_, reject) => {
      rejectLoad = reject
    })),
    dispose: vi.fn(),
  }

  const changing = setImageSource(annotator, nextSource)

  expect(state.image).toBeNull()
  expect(state.viewport).toBeNull()
  expect(oldSource.dispose).toHaveBeenCalledOnce()
  rejectLoad?.(new Error('decode failed'))
  await expect(changing).rejects.toThrow('decode failed')
})

test('redraws the interaction layer after every viewport transform', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  const state = getInternalState(annotator)
  const invalidate = vi.fn()
  state.image = {
    source: {} as CanvasImageSource,
    width: 400,
    height: 200,
  }
  state.viewport = createViewport({ width: 200, height: 100 })
  state.renderer = {
    eventCanvas: {} as HTMLCanvasElement,
    invalidate,
    resize() {},
    destroy() {},
  }

  fitToScreen(annotator)
  zoomTo(annotator, 2, { x: 50, y: 40 })
  panBy(annotator, { x: 12, y: -8 })

  expect(invalidate.mock.calls.filter(([layer]) => layer === 'interaction'))
    .toHaveLength(3)
})

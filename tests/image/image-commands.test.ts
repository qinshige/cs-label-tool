import { expect, test, vi } from 'vitest'

import { createAnnotator, setImageSource } from '../../src/index.js'
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

import { afterEach, expect, test, vi } from 'vitest'

import { createStandardImageSource } from '../../src/index.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('clones and closes an internally owned ImageBitmap exactly once', async () => {
  class FakeImageBitmap {
    readonly width = 100
    readonly height = 50
    readonly close = vi.fn()
  }
  const callerBitmap = new FakeImageBitmap()
  const ownedBitmap = new FakeImageBitmap()
  vi.stubGlobal('ImageBitmap', FakeImageBitmap)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ownedBitmap))
  const source = createStandardImageSource(callerBitmap as unknown as ImageBitmap)

  const loaded = await source.load(new AbortController().signal)
  source.dispose()
  source.dispose()

  expect(loaded.source).toBe(ownedBitmap)
  expect(ownedBitmap.close).toHaveBeenCalledOnce()
  expect(callerBitmap.close).not.toHaveBeenCalled()
})

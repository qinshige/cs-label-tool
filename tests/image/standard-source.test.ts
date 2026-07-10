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

test('does not close a shared clone when only one concurrent load aborts', async () => {
  class FakeImageBitmap {
    width = 100
    height = 50
    close = vi.fn()
  }
  let resolveClone: ((bitmap: FakeImageBitmap) => void) | undefined
  const callerBitmap = new FakeImageBitmap()
  const ownedBitmap = new FakeImageBitmap()
  vi.stubGlobal('ImageBitmap', FakeImageBitmap)
  vi.stubGlobal('createImageBitmap', vi.fn(() =>
    new Promise<FakeImageBitmap>(resolve => { resolveClone = resolve }),
  ))
  const source = createStandardImageSource(callerBitmap as unknown as ImageBitmap)
  const aborted = new AbortController()
  const active = new AbortController()

  const abortedLoad = source.load(aborted.signal)
  const activeLoad = source.load(active.signal)
  aborted.abort()
  resolveClone?.(ownedBitmap)

  await expect(abortedLoad).rejects.toMatchObject({ name: 'AbortError' })
  await expect(activeLoad).resolves.toMatchObject({ source: ownedBitmap })
  expect(ownedBitmap.close).not.toHaveBeenCalled()
  source.dispose()
  expect(ownedBitmap.close).toHaveBeenCalledOnce()
})

test('closes a pending clone once when disposed during decoding', async () => {
  class FakeImageBitmap {
    width = 100
    height = 50
    close = vi.fn()
  }
  let resolveClone: ((bitmap: FakeImageBitmap) => void) | undefined
  const ownedBitmap = new FakeImageBitmap()
  vi.stubGlobal('ImageBitmap', FakeImageBitmap)
  vi.stubGlobal('createImageBitmap', vi.fn(() =>
    new Promise<FakeImageBitmap>(resolve => { resolveClone = resolve }),
  ))
  const source = createStandardImageSource(
    new FakeImageBitmap() as unknown as ImageBitmap,
  )
  const load = source.load(new AbortController().signal)

  source.dispose()
  resolveClone?.(ownedBitmap)

  await expect(load).rejects.toMatchObject({ name: 'AbortError' })
  expect(ownedBitmap.close).toHaveBeenCalledOnce()
  source.dispose()
  expect(ownedBitmap.close).toHaveBeenCalledOnce()
})

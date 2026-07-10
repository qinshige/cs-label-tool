import { describe, expect, test } from 'vitest'

import {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from '../../src/index.js'

describe('annotator lifecycle', () => {
  test('creates isolated state and rejects use after destroy', () => {
    const container = {} as HTMLElement
    const annotator = createAnnotator({ container, historyLimit: 20 })

    expect(getSnapshot(annotator)).toMatchObject({
      revision: 0,
      annotations: [],
      labels: [],
    })

    destroyAnnotator(annotator)
    expect(() => getSnapshot(annotator)).toThrowError(/destroyed/i)
  })
})

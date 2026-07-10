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

  test('returns deeply isolated annotation geometry in snapshots', async () => {
    const {
      addLabel,
      addRect,
    } = await import('../../src/index.js')
    const annotator = createAnnotator({ container: {} as HTMLElement })
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    addRect(annotator, {
      labelId: 'person', x: 10, y: 20, width: 30, height: 40,
    })

    const snapshot = getSnapshot(annotator)
    const annotation = snapshot.annotations[0]
    expect(annotation).toBeDefined()
    expect(Object.isFrozen(annotation)).toBe(true)
    expect(Object.isFrozen(annotation?.geometry)).toBe(true)

    expect(getSnapshot(annotator).annotations[0]?.geometry).toEqual({
      type: 'rect', x: 10, y: 20, width: 30, height: 40,
    })
  })
})

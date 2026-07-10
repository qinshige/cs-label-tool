import { expect, test } from 'vitest'

import {
  addLabel,
  addRect,
  createAnnotator,
  getSnapshot,
} from '../../src/index.js'

test('adds 10,000 rectangles within the interaction budget', () => {
  const annotator = createAnnotator({
    container: {} as HTMLElement,
    historyLimit: 1,
  })
  addLabel(annotator, { id: 'object', name: 'Object', color: '#1677ff' })

  const startedAt = performance.now()
  for (let index = 0; index < 10_000; index += 1) {
    addRect(annotator, {
      labelId: 'object',
      x: index * 2,
      y: index * 2,
      width: 10,
      height: 10,
    })
  }
  const duration = performance.now() - startedAt

  expect(getSnapshot(annotator).annotations).toHaveLength(10_000)
  expect(duration).toBeLessThan(3_000)
}, 30_000)

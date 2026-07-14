import { expect, test } from 'vitest'

import { cloneAnnotation } from '../../src/core/immutability.js'

test('deeply clones and freezes annotation metadata', () => {
  const nested = { model: { name: 'detector', versions: ['v1'] } }
  const annotation = cloneAnnotation({
    id: 'annotation-1',
    labelId: 'person',
    source: 'ai',
    status: 'suggested',
    revision: 1,
    createdAt: 1,
    updatedAt: 1,
    metadata: nested,
    geometry: { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
  })

  nested.model.name = 'mutated'
  nested.model.versions.push('v2')

  expect(annotation.metadata).toEqual({
    model: { name: 'detector', versions: ['v1'] },
  })
  expect(Object.isFrozen(annotation.metadata.model)).toBe(true)
})

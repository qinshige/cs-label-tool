import { expect, test } from 'vitest'

import {
  addLabel,
  addRect,
  createAnnotator,
  queryAnnotations,
  undo,
} from '../../src/index.js'

test('keeps annotation queries consistent with commands and undo', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
  const visibleId = addRect(annotator, {
    labelId: 'person',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  })
  addRect(annotator, {
    labelId: 'person',
    x: 10_000,
    y: 20_000,
    width: 30,
    height: 40,
  })

  expect(queryAnnotations(annotator, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }).map(annotation => annotation.id)).toEqual([visibleId])

  undo(annotator)
  undo(annotator)
  expect(queryAnnotations(annotator, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  })).toEqual([])
})

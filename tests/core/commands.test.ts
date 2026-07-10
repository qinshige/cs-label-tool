import { describe, expect, test } from 'vitest'

import {
  addLabel,
  addPolygon,
  addRect,
  canRedo,
  canUndo,
  createAnnotator,
  getSnapshot,
  redo,
  removeAnnotation,
  setActiveLabel,
  undo,
  updateAnnotation,
} from '../../src/index.js'

function createTestAnnotator(historyLimit = 20) {
  return createAnnotator({ container: {} as HTMLElement, historyLimit })
}

describe('domain commands', () => {
  test('adds a rectangle and reverses it through history', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const id = addRect(annotator, {
      labelId: 'person',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })

    expect(getSnapshot(annotator).annotations[0]?.id).toBe(id)
    expect(canUndo(annotator)).toBe(true)
    expect(undo(annotator)).toBe(true)
    expect(getSnapshot(annotator).annotations).toHaveLength(0)
    expect(canRedo(annotator)).toBe(true)
    expect(redo(annotator)).toBe(true)
    expect(getSnapshot(annotator).annotations[0]?.id).toBe(id)
  })

  test('rejects an unknown label without partially changing state', () => {
    const annotator = createTestAnnotator()
    const before = getSnapshot(annotator)

    expect(() => addRect(annotator, {
      labelId: 'missing',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })).toThrowError(/unknown label/i)

    expect(getSnapshot(annotator)).toEqual(before)
  })

  test('adds, updates, and removes polygon annotations', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'car', name: 'Car', color: '#1677ff' })
    setActiveLabel(annotator, 'car')
    const id = addPolygon(annotator, {
      labelId: 'car',
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 20 }],
    })

    updateAnnotation(annotator, id, {
      type: 'polygon',
      points: [[0, 0], [30, 0], [10, 20]],
    })
    expect(getSnapshot(annotator).annotations[0]?.geometry).toEqual({
      type: 'polygon',
      points: [[0, 0], [30, 0], [10, 20]],
    })

    expect(removeAnnotation(annotator, id)).toBe(true)
    expect(getSnapshot(annotator).annotations).toHaveLength(0)
  })

  test('bounds undo history to the configured capacity', () => {
    const annotator = createTestAnnotator(2)
    addLabel(annotator, { id: 'one', name: 'One', color: '#111111' })
    addLabel(annotator, { id: 'two', name: 'Two', color: '#222222' })
    addLabel(annotator, { id: 'three', name: 'Three', color: '#333333' })

    expect(undo(annotator)).toBe(true)
    expect(undo(annotator)).toBe(true)
    expect(undo(annotator)).toBe(false)
    expect(getSnapshot(annotator).labels.map(label => label.id)).toEqual(['one'])
  })
})

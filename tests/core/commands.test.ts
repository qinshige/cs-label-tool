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
  getActiveLabel,
  getSelection,
  selectAnnotation,
  undo,
  updateAnnotation,
  updateAnnotationLabel,
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

  test('updates annotation labels through history', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    addLabel(annotator, { id: 'vehicle', name: 'Vehicle', color: '#1677ff' })
    const id = addRect(annotator, {
      labelId: 'person',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })

    updateAnnotationLabel(annotator, id, 'vehicle')
    expect(getSnapshot(annotator).annotations[0]?.labelId).toBe('vehicle')
    undo(annotator)
    expect(getSnapshot(annotator).annotations[0]?.labelId).toBe('person')
    redo(annotator)
    expect(getSnapshot(annotator).annotations[0]?.labelId).toBe('vehicle')
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

  test('copies caller geometry before storing an update', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const id = addRect(annotator, {
      labelId: 'person', x: 10, y: 20, width: 30, height: 40,
    })
    const geometry = {
      type: 'rect' as const,
      x: 50,
      y: 60,
      width: 70,
      height: 80,
    }

    updateAnnotation(annotator, id, geometry)
    geometry.x = 999

    expect(getSnapshot(annotator).annotations[0]?.geometry).toEqual({
      type: 'rect', x: 50, y: 60, width: 70, height: 80,
    })
  })

  test('tracks active-label changes in revision and history', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'one', name: 'One', color: '#111111' })
    addLabel(annotator, { id: 'two', name: 'Two', color: '#222222' })
    const revision = getSnapshot(annotator).revision

    setActiveLabel(annotator, 'two')
    expect(getActiveLabel(annotator)).toBe('two')
    expect(getSnapshot(annotator).revision).toBe(revision + 1)
    undo(annotator)
    expect(getActiveLabel(annotator)).toBe('one')
  })

  test('rejects invalid polygon edits without changing domain state', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'shape', name: 'Shape', color: '#333333' })
    const id = addPolygon(annotator, {
      labelId: 'shape',
      points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 20 }],
    })
    const before = getSnapshot(annotator)

    expect(() => updateAnnotation(annotator, id, {
      type: 'polygon',
      points: [[0, 0], [10, 10], [20, 20]],
    })).toThrowError(/invalid polygon/i)
    expect(getSnapshot(annotator)).toEqual(before)
  })

  test('clears invalid selections when remove or undo deletes an annotation', () => {
    const annotator = createTestAnnotator()
    addLabel(annotator, { id: 'shape', name: 'Shape', color: '#333333' })
    const id = addRect(annotator, {
      labelId: 'shape', x: 0, y: 0, width: 20, height: 20,
    })
    selectAnnotation(annotator, id)

    removeAnnotation(annotator, id)
    expect(getSelection(annotator)).toEqual([])
    undo(annotator)
    selectAnnotation(annotator, id)
    undo(annotator)
    expect(getSelection(annotator)).toEqual([])
  })
})

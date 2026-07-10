import { createInternalState, type InternalState } from './state.js'
import {
  AnnotatorError,
  createAnnotatorHandle,
  type AnnotationSnapshot,
  type Annotator,
  type AnnotatorOptions,
} from './types.js'

const states = new WeakMap<Annotator, InternalState>()

export function getInternalState(annotator: Annotator): InternalState {
  const state = states.get(annotator)
  if (state === undefined || state.destroyed) {
    throw new AnnotatorError(
      'ANNOTATOR_DESTROYED',
      'The annotator has been destroyed.',
    )
  }
  return state
}

export function createAnnotator(options: AnnotatorOptions): Annotator {
  const annotator = createAnnotatorHandle()
  states.set(annotator, createInternalState(options))
  return annotator
}

export function destroyAnnotator(annotator: Annotator): void {
  const state = states.get(annotator)
  if (state === undefined || state.destroyed) {
    return
  }
  state.destroyed = true
  state.imageAbortController?.abort()
  state.renderer?.destroy()
  state.imageSource?.dispose()
  state.imageAbortController = null
  state.renderer = null
  state.imageSource = null
  state.image = null
  state.viewport = null
  state.listeners.change.clear()
  state.listeners.error.clear()
}

export function getSnapshot(annotator: Annotator): AnnotationSnapshot {
  const state = getInternalState(annotator)
  return Object.freeze({
    schemaVersion: 1 as const,
    revision: state.revision,
    annotations: Object.freeze([...state.annotations]),
    labels: Object.freeze([...state.labels]),
  })
}

import { createInternalState, type InternalState } from './state.js'
import {
  AnnotatorError,
  createAnnotatorHandle,
  type AnnotationSnapshot,
  type Annotator,
  type AnnotatorOptions,
} from './types.js'

const states = new WeakMap<Annotator, InternalState>()

function requireState(annotator: Annotator): InternalState {
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
}

export function getSnapshot(annotator: Annotator): AnnotationSnapshot {
  const state = requireState(annotator)
  return Object.freeze({
    schemaVersion: 1 as const,
    revision: state.revision,
    annotations: Object.freeze([...state.annotations]),
    labels: Object.freeze([...state.labels]),
  })
}

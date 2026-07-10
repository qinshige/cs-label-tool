import { getInternalState } from './annotator.js'
import type { Annotator } from './types.js'

export type ChangeKind =
  | 'annotation:add'
  | 'annotation:remove'
  | 'annotation:update'
  | 'history:redo'
  | 'history:undo'
  | 'image:load'
  | 'label:activate'
  | 'label:add'

export interface ChangeEvent {
  readonly type: 'change'
  readonly kind: ChangeKind
  readonly revision: number
}

export interface AnnotatorErrorEvent {
  readonly type: 'error'
  readonly code: 'SUBSCRIBER_ERROR'
  readonly error: unknown
}

export interface AnnotatorEventMap {
  readonly change: ChangeEvent
  readonly error: AnnotatorErrorEvent
}

export type AnnotatorEventName = keyof AnnotatorEventMap
export type AnnotatorEventListener<K extends AnnotatorEventName> = (
  event: AnnotatorEventMap[K],
) => void

export interface EventListeners {
  readonly change: Set<AnnotatorEventListener<'change'>>
  readonly error: Set<AnnotatorEventListener<'error'>>
}

function emitSubscriberError(annotator: Annotator, error: unknown): void {
  const state = getInternalState(annotator)
  const event: AnnotatorErrorEvent = {
    type: 'error',
    code: 'SUBSCRIBER_ERROR',
    error,
  }
  for (const listener of [...state.listeners.error]) {
    try {
      listener(event)
    } catch {
      // Consumer error listeners are isolated and never recurse.
    }
  }
}

export function emitChange(annotator: Annotator, kind: ChangeKind): void {
  const state = getInternalState(annotator)
  const event: ChangeEvent = {
    type: 'change',
    kind,
    revision: state.revision,
  }
  for (const listener of [...state.listeners.change]) {
    try {
      listener(event)
    } catch (error) {
      emitSubscriberError(annotator, error)
    }
  }
}

export function subscribe<K extends AnnotatorEventName>(
  annotator: Annotator,
  type: K,
  listener: AnnotatorEventListener<K>,
): () => void {
  const state = getInternalState(annotator)
  const listeners = state.listeners[type] as Set<AnnotatorEventListener<K>>
  listeners.add(listener)
  let subscribed = true

  return () => {
    if (!subscribed) {
      return
    }
    subscribed = false
    listeners.delete(listener)
  }
}

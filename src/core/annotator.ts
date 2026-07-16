import { createInternalState, type InternalState } from './state.js'
import {
  AnnotatorError,
  createAnnotatorHandle,
  type AnnotationSnapshot,
  type Annotator,
  type AnnotatorOptions,
} from './types.js'
import { cloneAnnotation } from './immutability.js'

const states = new WeakMap<Annotator, InternalState>()

/** 通过不透明句柄读取内部状态，同时统一拦截已销毁实例。 */
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
  state.toolController?.destroy()
  state.imageAbortController?.abort()
  state.renderer?.destroy()
  state.imageSource?.dispose()
  state.destroyed = true
  state.imageAbortController = null
  state.renderer = null
  state.imageSource = null
  state.image = null
  state.viewport = null
  state.toolController = null
  state.activeToolId = null
  state.interactionDraft = null
  state.selectionOutline = null
  state.selectedIds = []
  state.listeners.change.clear()
  state.listeners.error.clear()
}

export function getSnapshot(annotator: Annotator): AnnotationSnapshot {
  const state = getInternalState(annotator)
  // 快照中的标注会深拷贝并冻结，调用方不能绕过命令层直接修改内部数据。
  return Object.freeze({
    schemaVersion: 1 as const,
    revision: state.revision,
    annotations: Object.freeze(state.annotations.map(cloneAnnotation)),
    labels: Object.freeze(
      state.labels.map(label => Object.freeze({ ...label })),
    ),
    classificationOptions: Object.freeze(
      state.classificationOptions.map(option => Object.freeze({ ...option })),
    ),
    classificationId: state.classificationId,
  })
}

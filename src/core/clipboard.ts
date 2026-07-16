import { getInternalState } from './annotator.js'
import {
  commitAnnotationList,
  translateAnnotationGeometry,
} from './arrangement-commands.js'
import { cloneAnnotation } from './immutability.js'
import type { Annotation, Annotator } from './types.js'
import { selectAnnotations } from '../selection/selection-commands.js'

interface ClipboardState {
  annotations: readonly Annotation[]
  pasteCount: number
}

const clipboards = new WeakMap<Annotator, ClipboardState>()

export function copyAnnotations(
  annotator: Annotator,
  ids: readonly string[],
): number {
  const state = getInternalState(annotator)
  const selected = new Set(ids)
  const annotations = state.annotations
    .filter(item => selected.has(item.id))
    .map(cloneAnnotation)
  clipboards.set(annotator, { annotations, pasteCount: 0 })
  return annotations.length
}

function createPastedAnnotations(
  source: readonly Annotation[],
  offset: number,
): Annotation[] {
  const groupIds = new Map<string, string>()
  const now = Date.now()
  return source.map(annotation => {
    const nextGroupId = annotation.groupId === undefined
      ? undefined
      : groupIds.get(annotation.groupId) ?? (() => {
          const id = globalThis.crypto.randomUUID()
          groupIds.set(annotation.groupId!, id)
          return id
        })()
    const {
      groupId: _groupId,
      locked: _locked,
      hidden: _hidden,
      ...rest
    } = annotation
    return cloneAnnotation({
      ...rest,
      id: globalThis.crypto.randomUUID(),
      geometry: translateAnnotationGeometry(annotation.geometry, {
        x: offset,
        y: offset,
      }),
      revision: 1,
      createdAt: now,
      updatedAt: now,
      ...(nextGroupId === undefined ? {} : { groupId: nextGroupId }),
    } as Annotation)
  })
}

export function pasteAnnotations(annotator: Annotator): readonly string[] {
  const clipboard = clipboards.get(annotator)
  if (clipboard === undefined || clipboard.annotations.length === 0) {
    return []
  }
  const state = getInternalState(annotator)
  clipboard.pasteCount += 1
  const screenOffset = 12 * clipboard.pasteCount
  const imageOffset = screenOffset / (state.viewport?.scale ?? 1)
  const pasted = createPastedAnnotations(clipboard.annotations, imageOffset)
  commitAnnotationList(
    annotator,
    state.annotations,
    [...state.annotations, ...pasted],
  )
  const ids = pasted.map(item => item.id)
  selectAnnotations(annotator, ids, { expandGroups: false })
  return ids
}

export function duplicateAnnotations(
  annotator: Annotator,
  ids: readonly string[],
): readonly string[] {
  copyAnnotations(annotator, ids)
  return pasteAnnotations(annotator)
}

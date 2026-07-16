import { getInternalState } from './annotator.js'
import { commitDomainCommand, getGeometryBounds } from './commands.js'
import { cloneAnnotation } from './immutability.js'
import type { Annotation, Annotator } from './types.js'
import { createGridIndex, insertSpatialItem } from '../spatial/grid-index.js'
import type { Point } from '../geometry/types.js'
import {
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  translateBinaryMask,
} from '../mask/rle.js'

function uniqueExistingIds(annotator: Annotator, ids: readonly string[]): string[] {
  const state = getInternalState(annotator)
  return [...new Set(ids)].filter(id => state.annotationsById.has(id))
}

function rebuildState(
  state: ReturnType<typeof getInternalState>,
  annotations: readonly Annotation[],
): void {
  state.annotations = [...annotations]
  state.annotationsById = new Map(annotations.map(item => [item.id, item]))
  state.spatialIndex = createGridIndex(state.spatialIndex.cellSize)
  for (const annotation of annotations) {
    insertSpatialItem(
      state.spatialIndex,
      annotation.id,
      getGeometryBounds(annotation.geometry),
    )
  }
  state.selectedIds = state.selectedIds.filter(id =>
    state.annotationsById.has(id) && state.annotationsById.get(id)?.hidden !== true,
  )
}

export function commitAnnotationList(
  annotator: Annotator,
  previous: readonly Annotation[],
  next: readonly Annotation[],
): void {
  commitDomainCommand(
    annotator,
    'annotation:update',
    state => rebuildState(state, next),
    state => rebuildState(state, previous),
  )
}

function updateFields(
  annotator: Annotator,
  ids: readonly string[],
  update: (annotation: Annotation) => Annotation | null,
): number {
  const state = getInternalState(annotator)
  const targetIds = new Set(uniqueExistingIds(annotator, ids))
  let changed = 0
  const next = state.annotations.map(annotation => {
    if (!targetIds.has(annotation.id)) {
      return annotation
    }
    const updated = update(annotation)
    if (updated === null || updated === annotation) {
      return annotation
    }
    changed += 1
    return cloneAnnotation(updated)
  })
  if (changed > 0) {
    commitAnnotationList(annotator, state.annotations, next)
  }
  return changed
}

export function setAnnotationsLocked(
  annotator: Annotator,
  ids: readonly string[],
  locked: boolean,
): number {
  return updateFields(annotator, ids, annotation => {
    if ((annotation.locked === true) === locked) {
      return annotation
    }
    const { locked: _locked, ...rest } = annotation
    return {
      ...rest,
      ...(locked ? { locked: true } : {}),
      revision: annotation.revision + 1,
      updatedAt: Date.now(),
    } as Annotation
  })
}

export function setAnnotationsHidden(
  annotator: Annotator,
  ids: readonly string[],
  hidden: boolean,
): number {
  return updateFields(annotator, ids, annotation => {
    if (annotation.locked === true || (annotation.hidden === true) === hidden) {
      return annotation
    }
    const { hidden: _hidden, ...rest } = annotation
    return {
      ...rest,
      ...(hidden ? { hidden: true } : {}),
      revision: annotation.revision + 1,
      updatedAt: Date.now(),
    } as Annotation
  })
}

export function groupAnnotations(
  annotator: Annotator,
  ids: readonly string[],
): string | null {
  const state = getInternalState(annotator)
  const targets = uniqueExistingIds(annotator, ids).filter(
    id => state.annotationsById.get(id)?.locked !== true,
  )
  if (targets.length < 2) {
    return null
  }
  const groupId = globalThis.crypto.randomUUID()
  updateFields(annotator, targets, annotation => ({
    ...annotation,
    groupId,
    revision: annotation.revision + 1,
    updatedAt: Date.now(),
  } as Annotation))
  return groupId
}

export function ungroupAnnotations(
  annotator: Annotator,
  ids: readonly string[],
): number {
  const state = getInternalState(annotator)
  const groups = new Set(uniqueExistingIds(annotator, ids)
    .map(id => state.annotationsById.get(id)?.groupId)
    .filter((id): id is string => id !== undefined))
  return updateFields(
    annotator,
    state.annotations.filter(item => item.groupId !== undefined && groups.has(item.groupId))
      .map(item => item.id),
    annotation => {
      if (annotation.locked === true) {
        return annotation
      }
      const { groupId: _groupId, ...rest } = annotation
      return {
        ...rest,
        revision: annotation.revision + 1,
        updatedAt: Date.now(),
      } as Annotation
    },
  )
}

function arrange(
  annotator: Annotator,
  ids: readonly string[],
  mode: 'forward' | 'backward' | 'front' | 'back',
): number {
  const state = getInternalState(annotator)
  const targets = new Set(uniqueExistingIds(annotator, ids).filter(
    id => state.annotationsById.get(id)?.locked !== true,
  ))
  if (targets.size === 0) {
    return 0
  }
  const next = [...state.annotations]
  if (mode === 'front' || mode === 'back') {
    const selected = next.filter(item => targets.has(item.id))
    const rest = next.filter(item => !targets.has(item.id))
    next.splice(0, next.length, ...(mode === 'front'
      ? [...rest, ...selected]
      : [...selected, ...rest]))
  } else if (mode === 'forward') {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (targets.has(next[index]!.id) && !targets.has(next[index + 1]!.id)) {
        ;[next[index], next[index + 1]] = [next[index + 1]!, next[index]!]
      }
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (targets.has(next[index]!.id) && !targets.has(next[index - 1]!.id)) {
        ;[next[index], next[index - 1]] = [next[index - 1]!, next[index]!]
      }
    }
  }
  if (next.every((item, index) => item === state.annotations[index])) {
    return 0
  }
  commitAnnotationList(annotator, state.annotations, next)
  return targets.size
}

export const bringForward = (annotator: Annotator, ids: readonly string[]) =>
  arrange(annotator, ids, 'forward')
export const sendBackward = (annotator: Annotator, ids: readonly string[]) =>
  arrange(annotator, ids, 'backward')
export const bringToFront = (annotator: Annotator, ids: readonly string[]) =>
  arrange(annotator, ids, 'front')
export const sendToBack = (annotator: Annotator, ids: readonly string[]) =>
  arrange(annotator, ids, 'back')

function clearSingletonGroups(annotations: readonly Annotation[]): Annotation[] {
  const counts = new Map<string, number>()
  for (const item of annotations) {
    if (item.groupId !== undefined) {
      counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1)
    }
  }
  return annotations.map(item =>
    item.groupId !== undefined && counts.get(item.groupId) === 1
      ? (() => {
          const { groupId: _groupId, ...rest } = item
          return cloneAnnotation(rest as Annotation)
        })()
      : item,
  )
}

export function removeAnnotations(
  annotator: Annotator,
  ids: readonly string[],
): number {
  const state = getInternalState(annotator)
  const targets = new Set(uniqueExistingIds(annotator, ids).filter(
    id => state.annotationsById.get(id)?.locked !== true,
  ))
  if (targets.size === 0) {
    return 0
  }
  if (state.selectedIds.some(id => targets.has(id))) {
    // 删除正在拖拽或编辑的标注前先取消工具手势，避免 pointerup 再提交旧 ID。
    state.toolController?.cancel()
    state.interactionDraft = null
  }
  const next = clearSingletonGroups(
    state.annotations.filter(item => !targets.has(item.id)),
  )
  commitAnnotationList(annotator, state.annotations, next)
  return targets.size
}

export function translateAnnotationGeometry(
  geometry: Annotation['geometry'],
  delta: Point,
): Annotation['geometry'] {
  if (geometry.type === 'rect') {
    return { ...geometry, x: geometry.x + delta.x, y: geometry.y + delta.y }
  }
  if (geometry.type === 'point') {
    return { ...geometry, x: geometry.x + delta.x, y: geometry.y + delta.y }
  }
  if (geometry.type === 'ellipse') {
    return { ...geometry, cx: geometry.cx + delta.x, cy: geometry.cy + delta.y }
  }
  if (geometry.type === 'polygon' || geometry.type === 'polyline') {
    return {
      type: geometry.type,
      points: geometry.points.map(([x, y]) => [x + delta.x, y + delta.y]),
    }
  }
  const mask = decodeBinaryMaskRle(geometry.rle, geometry.width, geometry.height)
  return {
    ...geometry,
    rle: encodeBinaryMaskRle(translateBinaryMask(
      mask,
      geometry.width,
      geometry.height,
      delta.x,
      delta.y,
    )),
  }
}

export function translateAnnotations(
  annotator: Annotator,
  ids: readonly string[],
  delta: Point,
): number {
  if (delta.x === 0 && delta.y === 0) {
    return 0
  }
  return updateFields(annotator, ids, annotation => {
    if (annotation.locked === true) {
      return annotation
    }
    return {
      ...annotation,
      geometry: translateAnnotationGeometry(annotation.geometry, delta),
      revision: annotation.revision + 1,
      updatedAt: Date.now(),
    } as Annotation
  })
}

export function updateAnnotationsLabel(
  annotator: Annotator,
  ids: readonly string[],
  labelId: string,
): number {
  const state = getInternalState(annotator)
  if (!state.labels.some(label => label.id === labelId)) {
    throw new Error(`Unknown label: ${labelId}`)
  }
  return updateFields(annotator, ids, annotation => {
    if (annotation.locked === true || annotation.labelId === labelId) {
      return annotation
    }
    return {
      ...annotation,
      labelId,
      revision: annotation.revision + 1,
      updatedAt: Date.now(),
    } as Annotation
  })
}

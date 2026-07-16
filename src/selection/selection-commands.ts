import { getInternalState } from '../core/annotator.js'
import { queryAnnotations } from '../core/commands.js'
import { emitChange } from '../core/events.js'
import type { Annotator } from '../core/types.js'
import type { Bounds, Point } from '../geometry/types.js'
import type { SelectionInteractionDraft } from '../tools/types.js'
import {
  annotationIntersectsBounds,
  annotationIntersectsLasso,
} from './hit-test.js'

export interface SelectionOptions {
  readonly expandGroups?: boolean
}

/**
 * 保存完成后的框选或套索边界。它和工具的实时草稿分开，切换工具时不会被清掉。
 */
export function setSelectionOutline(
  annotator: Annotator,
  outline: SelectionInteractionDraft | null,
): void {
  const state = getInternalState(annotator)
  state.selectionOutline = outline === null
    ? null
    : {
        ...outline,
        points: outline.points.map(point => ({ ...point })),
      }
  state.renderer?.invalidate('interaction')
}

export function getSelectionOutline(
  annotator: Annotator,
): SelectionInteractionDraft | null {
  const outline = getInternalState(annotator).selectionOutline
  return outline === null
    ? null
    : {
        ...outline,
        points: outline.points.map(point => ({ ...point })),
      }
}

function expandSelection(
  annotator: Annotator,
  ids: readonly string[],
  expandGroups: boolean,
): string[] {
  const state = getInternalState(annotator)
  const requested = new Set(ids)
  const groups = new Set<string>()
  for (const id of requested) {
    const annotation = state.annotationsById.get(id)
    if (annotation?.groupId !== undefined && expandGroups) {
      groups.add(annotation.groupId)
    }
  }
  return state.annotations
    .filter(annotation =>
      annotation.hidden !== true && (
        requested.has(annotation.id) ||
        (annotation.groupId !== undefined && groups.has(annotation.groupId))
      ),
    )
    .map(annotation => annotation.id)
}

function applySelection(annotator: Annotator, ids: readonly string[]): void {
  const state = getInternalState(annotator)
  if (
    state.selectedIds.length === ids.length &&
    state.selectedIds.every((id, index) => id === ids[index])
  ) {
    return
  }
  state.selectedIds = [...ids]
  state.renderer?.invalidate('interaction')
  emitChange(annotator, 'selection:update')
}

export function selectAnnotations(
  annotator: Annotator,
  ids: readonly string[],
  options: SelectionOptions = {},
): readonly string[] {
  const next = expandSelection(annotator, ids, options.expandGroups !== false)
  applySelection(annotator, next)
  return [...next]
}

export function toggleAnnotationSelection(
  annotator: Annotator,
  id: string,
  options: SelectionOptions = {},
): readonly string[] {
  const state = getInternalState(annotator)
  const expanded = expandSelection(
    annotator,
    [id],
    options.expandGroups !== false,
  )
  const selected = new Set(state.selectedIds)
  const remove = expanded.some(item => selected.has(item))
  for (const item of expanded) {
    if (remove) {
      selected.delete(item)
    } else {
      selected.add(item)
    }
  }
  const next = state.annotations
    .filter(item => selected.has(item.id))
    .map(item => item.id)
  applySelection(annotator, next)
  return [...next]
}

export function selectAnnotationsInBounds(
  annotator: Annotator,
  bounds: Bounds,
  options: SelectionOptions = {},
): readonly string[] {
  const ids = queryAnnotations(annotator, bounds)
    .filter(annotation => annotationIntersectsBounds(annotation, bounds))
    .map(annotation => annotation.id)
  return selectAnnotations(annotator, ids, options)
}

export function selectAnnotationsInLasso(
  annotator: Annotator,
  points: readonly Point[],
  options: SelectionOptions = {},
): readonly string[] {
  if (points.length < 3) {
    applySelection(annotator, [])
    return []
  }
  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  const bounds = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
  const ids = queryAnnotations(annotator, bounds)
    .filter(annotation => annotationIntersectsLasso(annotation, points))
    .map(annotation => annotation.id)
  return selectAnnotations(annotator, ids, options)
}

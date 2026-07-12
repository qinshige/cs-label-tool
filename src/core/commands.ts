import type { Bounds, Point } from '../geometry/types.js'
import { validatePolygon } from '../geometry/polygon.js'
import {
  insertSpatialItem,
  querySpatialBounds,
  removeSpatialItem,
  restoreSpatialItem,
  updateSpatialItem,
} from '../spatial/grid-index.js'
import { getInternalState } from './annotator.js'
import { emitChange, type ChangeKind } from './events.js'
import { cloneAnnotation } from './immutability.js'
import type { HistoryEntry, InternalState } from './state.js'
import { AnnotatorError } from './types.js'
import type {
  Annotation,
  AnnotationBase,
  Annotator,
  MaskGeometry,
  PolygonGeometry,
  RectGeometry,
} from './types.js'

export interface AddRectInput extends Omit<RectGeometry, 'type'> {
  readonly labelId: string
}

export interface AddPolygonInput {
  readonly labelId: string
  readonly points: readonly Point[]
}

function recordHistory(
  annotator: Annotator,
  kind: ChangeKind,
  entry: HistoryEntry,
): void {
  const state = getInternalState(annotator)
  state.revision += 1
  state.undoStack.push(entry)
  if (state.undoStack.length > state.historyLimit) {
    state.undoStack.shift()
  }
  state.redoStack = []
  emitChange(annotator, kind)
}

export function commitDomainCommand(
  annotator: Annotator,
  kind: ChangeKind,
  redo: (state: InternalState) => void,
  undo: (state: InternalState) => void,
): void {
  const state = getInternalState(annotator)
  redo(state)
  recordHistory(annotator, kind, { undo, redo })
}

function requireLabel(state: InternalState, labelId: string): void {
  if (!state.labels.some(label => label.id === labelId)) {
    throw new AnnotatorError('UNKNOWN_LABEL', `Unknown label: ${labelId}`)
  }
}

function createAnnotationBase(labelId: string): AnnotationBase {
  const now = Date.now()
  return {
    id: globalThis.crypto.randomUUID(),
    labelId,
    source: 'manual',
    status: 'accepted',
    revision: 1,
    createdAt: now,
    updatedAt: now,
    metadata: Object.freeze({}),
  }
}

function validateRect(geometry: RectGeometry): void {
  if (
    ![
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
    ].every(Number.isFinite) ||
    geometry.width <= 0 ||
    geometry.height <= 0
  ) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Rectangle coordinates must be finite and dimensions must be positive.',
    )
  }
}

function validateGeometry(geometry: RectGeometry | PolygonGeometry | MaskGeometry): void {
  if (geometry.type === 'rect') {
    validateRect(geometry)
    return
  }
  if (geometry.type === 'polygon') {
    const result = validatePolygon(
      geometry.points.map(([x, y]) => ({ x, y })),
    )
    if (!result.valid) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        `Invalid polygon: ${result.reason}`,
      )
    }
    return
  }
  if (geometry.type === 'mask') {
    if (geometry.width <= 0 || geometry.height <= 0) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        'Mask dimensions must be positive.',
      )
    }
    return
  }
}

function getGeometryBounds(
  geometry: RectGeometry | PolygonGeometry | MaskGeometry,
): Bounds {
  if (geometry.type === 'rect') {
    return geometry
  }
  if (geometry.type === 'mask') {
    return { x: 0, y: 0, width: geometry.width, height: geometry.height }
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [x, y] of geometry.points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function insertAnnotation(
  state: InternalState,
  annotation: Annotation,
  index = state.annotations.length,
  order?: number,
): void {
  state.annotations.splice(index, 0, annotation)
  state.annotationsById.set(annotation.id, annotation)
  const bounds = getGeometryBounds(annotation.geometry)
  if (order === undefined) {
    insertSpatialItem(state.spatialIndex, annotation.id, bounds)
  } else {
    restoreSpatialItem(state.spatialIndex, annotation.id, bounds, order)
  }
}

function deleteAnnotation(state: InternalState, id: string): void {
  if (state.selectedIds.includes(id)) {
    state.toolController?.cancel()
    state.selectedIds = state.selectedIds.filter(selectedId => selectedId !== id)
    state.interactionDraft = null
  }
  const index = state.annotations.findIndex(annotation => annotation.id === id)
  if (index >= 0) {
    state.annotations.splice(index, 1)
  }
  state.annotationsById.delete(id)
  removeSpatialItem(state.spatialIndex, id)
}

export function addRect(annotator: Annotator, input: AddRectInput): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: RectGeometry = {
    type: 'rect',
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  }
  validateRect(geometry)
  const annotation = cloneAnnotation({
    ...createAnnotationBase(input.labelId),
    geometry,
  })
  const index = state.annotations.length

  commitDomainCommand(
    annotator,
    'annotation:add',
    current => insertAnnotation(current, annotation, index),
    current => deleteAnnotation(current, annotation.id),
  )
  return annotation.id
}

export function addPolygon(
  annotator: Annotator,
  input: AddPolygonInput,
): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: PolygonGeometry = {
    type: 'polygon',
    points: input.points.map(point => [point.x, point.y] as const),
  }
  validateGeometry(geometry)
  const annotation = cloneAnnotation({
    ...createAnnotationBase(input.labelId),
    geometry,
  })
  const index = state.annotations.length

  commitDomainCommand(
    annotator,
    'annotation:add',
    current => insertAnnotation(current, annotation, index),
    current => deleteAnnotation(current, annotation.id),
  )
  return annotation.id
}

export interface AddMaskInput {
  readonly labelId: string
  readonly width: number
  readonly height: number
  readonly rle: readonly number[]
}

export function addMask(annotator: Annotator, input: AddMaskInput): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: MaskGeometry = {
    type: 'mask',
    width: input.width,
    height: input.height,
    rle: input.rle,
  }
  validateGeometry(geometry)
  const annotation = cloneAnnotation({
    ...createAnnotationBase(input.labelId),
    geometry,
  })
  const index = state.annotations.length

  commitDomainCommand(
    annotator,
    'annotation:add',
    current => insertAnnotation(current, annotation, index),
    current => deleteAnnotation(current, annotation.id),
  )
  return annotation.id
}

export function updateAnnotation(
  annotator: Annotator,
  id: string,
  geometry: RectGeometry | PolygonGeometry | MaskGeometry,
): void {
  validateGeometry(geometry)
  const state = getInternalState(annotator)
  const previous = state.annotationsById.get(id)
  if (previous === undefined) {
    throw new AnnotatorError(
      'ANNOTATION_NOT_FOUND',
      `Annotation not found: ${id}`,
    )
  }
  if (previous.geometry.type !== geometry.type) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Annotation geometry type cannot be changed.',
    )
  }
  const next = cloneAnnotation({
    ...previous,
    geometry,
    revision: previous.revision + 1,
    updatedAt: Date.now(),
  } as Annotation)
  const index = state.annotations.findIndex(annotation => annotation.id === id)

  const apply = (current: InternalState, annotation: Annotation) => {
    current.annotations[index] = annotation
    current.annotationsById.set(id, annotation)
    updateSpatialItem(
      current.spatialIndex,
      id,
      getGeometryBounds(annotation.geometry),
    )
  }
  commitDomainCommand(
    annotator,
    'annotation:update',
    current => apply(current, next),
    current => apply(current, previous),
  )
}

export function updateAnnotationLabel(
  annotator: Annotator,
  id: string,
  labelId: string,
): void {
  const state = getInternalState(annotator)
  requireLabel(state, labelId)
  const previous = state.annotationsById.get(id)
  if (previous === undefined) {
    throw new AnnotatorError(
      'ANNOTATION_NOT_FOUND',
      `Annotation not found: ${id}`,
    )
  }
  if (previous.labelId === labelId) {
    return
  }
  const next = cloneAnnotation({
    ...previous,
    labelId,
    revision: previous.revision + 1,
    updatedAt: Date.now(),
  } as Annotation)
  const index = state.annotations.findIndex(annotation => annotation.id === id)

  const apply = (current: InternalState, annotation: Annotation) => {
    current.annotations[index] = annotation
    current.annotationsById.set(id, annotation)
  }
  commitDomainCommand(
    annotator,
    'annotation:update',
    current => apply(current, next),
    current => apply(current, previous),
  )
}

export function removeAnnotation(annotator: Annotator, id: string): boolean {
  const state = getInternalState(annotator)
  const annotation = state.annotationsById.get(id)
  if (annotation === undefined) {
    return false
  }
  const index = state.annotations.findIndex(item => item.id === id)
  const order = state.spatialIndex.order.get(id)
  if (order === undefined) {
    throw new Error(`Spatial index is missing annotation: ${id}`)
  }

  commitDomainCommand(
    annotator,
    'annotation:remove',
    current => deleteAnnotation(current, id),
    current => insertAnnotation(current, annotation, index, order),
  )
  return true
}

export function canUndo(annotator: Annotator): boolean {
  return getInternalState(annotator).undoStack.length > 0
}

export function canRedo(annotator: Annotator): boolean {
  return getInternalState(annotator).redoStack.length > 0
}

export function undo(annotator: Annotator): boolean {
  const state = getInternalState(annotator)
  const entry = state.undoStack.pop()
  if (entry === undefined) {
    return false
  }
  entry.undo(state)
  state.redoStack.push(entry)
  state.revision += 1
  emitChange(annotator, 'history:undo')
  return true
}

export function redo(annotator: Annotator): boolean {
  const state = getInternalState(annotator)
  const entry = state.redoStack.pop()
  if (entry === undefined) {
    return false
  }
  entry.redo(state)
  state.undoStack.push(entry)
  state.revision += 1
  emitChange(annotator, 'history:redo')
  return true
}

export function queryAnnotations(
  annotator: Annotator,
  bounds: Bounds,
): Annotation[] {
  const state = getInternalState(annotator)
  return querySpatialBounds(state.spatialIndex, bounds)
    .map(id => state.annotationsById.get(id))
    .filter((annotation): annotation is Annotation => annotation !== undefined)
}

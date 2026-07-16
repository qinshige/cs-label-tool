import type { Bounds, Point } from '../geometry/types.js'
import {
  getRotatedRectBounds,
  normalizeRotation,
} from '../geometry/rect.js'
import { validatePolygon } from '../geometry/polygon.js'
import { getEllipseBounds } from '../geometry/ellipse.js'
import { getPolylineBounds } from '../geometry/polyline.js'
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
  AnnotationGeometry,
  Annotator,
  EllipseGeometry,
  MaskGeometry,
  PointGeometry,
  PolygonGeometry,
  PolylineGeometry,
  RectGeometry,
} from './types.js'

export interface AddRectInput extends Omit<RectGeometry, 'type'> {
  readonly labelId: string
}

export interface AddPolygonInput {
  readonly labelId: string
  readonly points: readonly Point[]
}

export interface AddPointInput extends Omit<PointGeometry, 'type'> {
  readonly labelId: string
}

export interface AddPolylineInput {
  readonly labelId: string
  readonly points: readonly Point[]
}

export interface AddEllipseInput extends Omit<EllipseGeometry, 'type'> {
  readonly labelId: string
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

/**
 * 所有领域修改的统一入口：先执行 redo，再记录可撤销操作并发送 change 事件。
 * UI 和工具不应直接修改 InternalState。
 */
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
      geometry.rotation ?? 0,
    ].every(Number.isFinite) ||
    geometry.width <= 0 ||
    geometry.height <= 0
  ) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Rectangle coordinates and rotation must be finite, and dimensions must be positive.',
    )
  }
}

function validateFinite(values: readonly number[], message: string): void {
  if (!values.every(Number.isFinite)) {
    throw new AnnotatorError('INVALID_GEOMETRY', message)
  }
}

function validateGeometry(geometry: AnnotationGeometry): void {
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
  if (geometry.type === 'point') {
    validateFinite([geometry.x, geometry.y], 'Point coordinates must be finite.')
    return
  }
  if (geometry.type === 'polyline') {
    if (geometry.points.length < 2) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        'A polyline must contain at least two points.',
      )
    }
    validateFinite(
      geometry.points.flatMap(([x, y]) => [x, y]),
      'Polyline coordinates must be finite.',
    )
    const unique = new Set(geometry.points.map(([x, y]) => `${x}:${y}`))
    if (unique.size < 2) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        'A polyline must contain at least two different points.',
      )
    }
    return
  }
  if (geometry.type === 'ellipse') {
    validateFinite(
      [geometry.cx, geometry.cy, geometry.radiusX, geometry.radiusY, geometry.rotation ?? 0],
      'Ellipse coordinates, radii, and rotation must be finite.',
    )
    if (geometry.radiusX <= 0 || geometry.radiusY <= 0) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        'Ellipse radii must be positive.',
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

export function getGeometryBounds(
  geometry: AnnotationGeometry,
): Bounds {
  if (geometry.type === 'rect') {
    return getRotatedRectBounds(geometry)
  }
  if (geometry.type === 'mask') {
    // Mask 数据与原图等大；更精确的像素边界由 mask 工具函数按需计算。
    return { x: 0, y: 0, width: geometry.width, height: geometry.height }
  }
  if (geometry.type === 'point') {
    return { x: geometry.x, y: geometry.y, width: 0, height: 0 }
  }
  if (geometry.type === 'polyline') {
    return getPolylineBounds(geometry)
  }
  if (geometry.type === 'ellipse') {
    return getEllipseBounds(geometry)
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
  // 主数组、ID Map 和空间索引必须作为一个整体更新。
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
  // 删除正在编辑的标注前先取消手势，避免 interaction draft 引用失效对象。
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
    ...(input.rotation === undefined
      ? {}
      : { rotation: normalizeRotation(input.rotation) }),
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

export function addPoint(annotator: Annotator, input: AddPointInput): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: PointGeometry = { type: 'point', x: input.x, y: input.y }
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

export function addPolyline(
  annotator: Annotator,
  input: AddPolylineInput,
): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: PolylineGeometry = {
    type: 'polyline',
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

export function addEllipse(
  annotator: Annotator,
  input: AddEllipseInput,
): string {
  const state = getInternalState(annotator)
  requireLabel(state, input.labelId)
  const geometry: EllipseGeometry = {
    type: 'ellipse',
    cx: input.cx,
    cy: input.cy,
    radiusX: input.radiusX,
    radiusY: input.radiusY,
    ...(input.rotation === undefined
      ? {}
      : { rotation: normalizeRotation(input.rotation) }),
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
  geometry: AnnotationGeometry,
): void {
  validateGeometry(geometry)
  const normalizedGeometry = (
    geometry.type === 'rect' || geometry.type === 'ellipse'
  ) && geometry.rotation !== undefined
    ? { ...geometry, rotation: normalizeRotation(geometry.rotation) }
    : geometry
  const state = getInternalState(annotator)
  const previous = state.annotationsById.get(id)
  if (previous === undefined) {
    throw new AnnotatorError(
      'ANNOTATION_NOT_FOUND',
      `Annotation not found: ${id}`,
    )
  }
  if (previous.locked === true) {
    throw new AnnotatorError('ANNOTATION_LOCKED', `Annotation is locked: ${id}`)
  }
  if (previous.geometry.type !== normalizedGeometry.type) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Annotation geometry type cannot be changed.',
    )
  }
  const next = cloneAnnotation({
    ...previous,
    geometry: normalizedGeometry,
    revision: previous.revision + 1,
    updatedAt: Date.now(),
  } as Annotation)
  const index = state.annotations.findIndex(annotation => annotation.id === id)

  const apply = (current: InternalState, annotation: Annotation) => {
    // 更新几何后同步刷新空间索引，否则区域查询仍会命中旧位置。
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
  if (previous.locked === true) {
    throw new AnnotatorError('ANNOTATION_LOCKED', `Annotation is locked: ${id}`)
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
  if (annotation.locked === true) {
    throw new AnnotatorError('ANNOTATION_LOCKED', `Annotation is locked: ${id}`)
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
  // 先通过网格索引取候选，再由上层按具体几何做精确命中。
  return querySpatialBounds(state.spatialIndex, bounds)
    .map(id => state.annotationsById.get(id))
    .filter((annotation): annotation is Annotation => annotation !== undefined)
}

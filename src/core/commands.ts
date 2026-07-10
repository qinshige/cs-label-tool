import { emitChange, type ChangeKind } from './events.js'
import { getInternalState } from './annotator.js'
import { AnnotatorError } from './types.js'
import type {
  Annotation,
  AnnotationBase,
  Annotator,
  LabelDefinition,
  PolygonGeometry,
  RectGeometry,
} from './types.js'
import type { DomainContents, InternalState } from './state.js'
import type { Point } from '../geometry/types.js'
import type { Bounds } from '../geometry/types.js'
import { validatePolygon } from '../geometry/polygon.js'
import {
  insertSpatialItem,
  querySpatialBounds,
  removeSpatialItem,
  updateSpatialItem,
  type GridIndex,
} from '../spatial/grid-index.js'

interface MutableDomainContents {
  annotations: Annotation[]
  labels: LabelDefinition[]
  activeLabelId: string | null
  spatialIndex: GridIndex
}

export interface AddRectInput extends Omit<RectGeometry, 'type'> {
  readonly labelId: string
}

export interface AddPolygonInput {
  readonly labelId: string
  readonly points: readonly Point[]
}

function captureDomain(state: InternalState): DomainContents {
  return {
    annotations: [...state.annotations],
    labels: [...state.labels],
    activeLabelId: state.activeLabelId,
    spatialIndex: state.spatialIndex,
  }
}

function createDraft(contents: DomainContents): MutableDomainContents {
  return {
    annotations: [...contents.annotations],
    labels: [...contents.labels],
    activeLabelId: contents.activeLabelId,
    spatialIndex: contents.spatialIndex,
  }
}

function applyDomain(state: InternalState, contents: DomainContents): void {
  state.annotations = [...contents.annotations]
  state.labels = [...contents.labels]
  state.activeLabelId = contents.activeLabelId
  state.spatialIndex = contents.spatialIndex
  state.annotationsById = new Map(
    contents.annotations.map(annotation => [annotation.id, annotation]),
  )
}

export function executeDomainMutation<T>(
  annotator: Annotator,
  kind: ChangeKind,
  mutate: (draft: MutableDomainContents) => T,
): T {
  const state = getInternalState(annotator)
  const before = captureDomain(state)
  const draft = createDraft(before)
  const result = mutate(draft)
  const after: DomainContents = {
    annotations: draft.annotations,
    labels: draft.labels,
    activeLabelId: draft.activeLabelId,
    spatialIndex: draft.spatialIndex,
  }

  applyDomain(state, after)
  state.revision += 1
  state.undoStack.push({ before, after })
  if (state.undoStack.length > state.historyLimit) {
    state.undoStack.shift()
  }
  state.redoStack = []
  emitChange(annotator, kind)
  return result
}

function requireLabel(draft: MutableDomainContents, labelId: string): void {
  if (!draft.labels.some(label => label.id === labelId)) {
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

function validateGeometry(geometry: RectGeometry | PolygonGeometry): void {
  if (geometry.type === 'rect') {
    validateRect(geometry)
    return
  }
  const result = validatePolygon(
    geometry.points.map(([x, y]) => ({ x, y })),
  )
  if (!result.valid) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      `Invalid polygon: ${result.reason}`,
    )
  }
}

function getGeometryBounds(
  geometry: RectGeometry | PolygonGeometry,
): Bounds {
  if (geometry.type === 'rect') {
    return geometry
  }
  const xs = geometry.points.map(([x]) => x)
  const ys = geometry.points.map(([, y]) => y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  }
}

export function addRect(annotator: Annotator, input: AddRectInput): string {
  return executeDomainMutation(annotator, 'annotation:add', draft => {
    requireLabel(draft, input.labelId)
    const geometry: RectGeometry = {
      type: 'rect',
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
    }
    validateRect(geometry)
    const annotation: Annotation = {
      ...createAnnotationBase(input.labelId),
      geometry,
    }
    draft.annotations.push(annotation)
    draft.spatialIndex = insertSpatialItem(
      draft.spatialIndex,
      annotation.id,
      getGeometryBounds(annotation.geometry),
    )
    return annotation.id
  })
}

export function addPolygon(
  annotator: Annotator,
  input: AddPolygonInput,
): string {
  return executeDomainMutation(annotator, 'annotation:add', draft => {
    requireLabel(draft, input.labelId)
    const geometry: PolygonGeometry = {
      type: 'polygon',
      points: input.points.map(point => [point.x, point.y] as const),
    }
    validateGeometry(geometry)
    const annotation: Annotation = {
      ...createAnnotationBase(input.labelId),
      geometry,
    }
    draft.annotations.push(annotation)
    draft.spatialIndex = insertSpatialItem(
      draft.spatialIndex,
      annotation.id,
      getGeometryBounds(annotation.geometry),
    )
    return annotation.id
  })
}

export function updateAnnotation(
  annotator: Annotator,
  id: string,
  geometry: RectGeometry | PolygonGeometry,
): void {
  executeDomainMutation(annotator, 'annotation:update', draft => {
    validateGeometry(geometry)
    const index = draft.annotations.findIndex(annotation => annotation.id === id)
    const annotation = draft.annotations[index]
    if (annotation === undefined) {
      throw new AnnotatorError(
        'ANNOTATION_NOT_FOUND',
        `Annotation not found: ${id}`,
      )
    }
    if (annotation.geometry.type !== geometry.type) {
      throw new AnnotatorError(
        'INVALID_GEOMETRY',
        'Annotation geometry type cannot be changed.',
      )
    }
    draft.annotations[index] = {
      ...annotation,
      geometry,
      revision: annotation.revision + 1,
      updatedAt: Date.now(),
    } as Annotation
    draft.spatialIndex = updateSpatialItem(
      draft.spatialIndex,
      id,
      getGeometryBounds(geometry),
    )
  })
}

export function removeAnnotation(annotator: Annotator, id: string): boolean {
  const state = getInternalState(annotator)
  if (!state.annotations.some(annotation => annotation.id === id)) {
    return false
  }
  return executeDomainMutation(annotator, 'annotation:remove', draft => {
    draft.annotations = draft.annotations.filter(annotation => annotation.id !== id)
    draft.spatialIndex = removeSpatialItem(draft.spatialIndex, id)
    return true
  })
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
  applyDomain(state, entry.before)
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
  applyDomain(state, entry.after)
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

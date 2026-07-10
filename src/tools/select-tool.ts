import { normalizeRect, pointInRect } from '../geometry/rect.js'
import { pointInPolygon, validatePolygon } from '../geometry/polygon.js'
import type { Bounds, Point } from '../geometry/types.js'
import {
  AnnotatorError,
  type Annotation,
  type Annotator,
  type PolygonGeometry,
  type RectGeometry,
} from '../core/types.js'
import {
  queryAnnotations,
  removeAnnotation,
  updateAnnotation,
} from '../core/commands.js'
import { getInternalState } from '../core/annotator.js'
import { activateTool } from './controller.js'
import type {
  NormalizedPointerInput,
  Tool,
  ToolContext,
} from './types.js'

export type RectHandle =
  | 'east'
  | 'north'
  | 'north-east'
  | 'north-west'
  | 'south'
  | 'south-east'
  | 'south-west'
  | 'west'

export function moveRect(
  geometry: RectGeometry,
  delta: Point,
): RectGeometry {
  return {
    ...geometry,
    x: geometry.x + delta.x,
    y: geometry.y + delta.y,
  }
}

export function movePolygonVertex(
  geometry: PolygonGeometry,
  index: number,
  point: Point,
): PolygonGeometry {
  return {
    type: 'polygon',
    points: geometry.points.map((current, currentIndex) =>
      currentIndex === index ? [point.x, point.y] as const : current,
    ),
  }
}

export function removePolygonVertex(
  geometry: PolygonGeometry,
  index: number,
): PolygonGeometry | null {
  if (geometry.points.length <= 3) {
    return null
  }
  const points = geometry.points.filter((_, currentIndex) => currentIndex !== index)
  const candidate: PolygonGeometry = { type: 'polygon', points }
  return validatePolygon(points.map(([x, y]) => ({ x, y }))).valid
    ? candidate
    : null
}

export function resizeRect(
  geometry: RectGeometry,
  handle: RectHandle,
  point: Point,
): RectGeometry {
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  const movesWest = handle.includes('west')
  const movesEast = handle.includes('east')
  const movesNorth = handle.includes('north')
  const movesSouth = handle.includes('south')
  const start = {
    x: movesWest ? point.x : left,
    y: movesNorth ? point.y : top,
  }
  const end = {
    x: movesEast ? point.x : right,
    y: movesSouth ? point.y : bottom,
  }
  return { type: 'rect', ...normalizeRect(start, end) }
}

function squaredDistance(first: Point, second: Point): number {
  const x = first.x - second.x
  const y = first.y - second.y
  return x * x + y * y
}

function rectHandlePoints(geometry: RectGeometry): readonly [RectHandle, Point][] {
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2
  return [
    ['north-west', { x: left, y: top }],
    ['north', { x: centerX, y: top }],
    ['north-east', { x: right, y: top }],
    ['east', { x: right, y: centerY }],
    ['south-east', { x: right, y: bottom }],
    ['south', { x: centerX, y: bottom }],
    ['south-west', { x: left, y: bottom }],
    ['west', { x: left, y: centerY }],
  ]
}

function annotationContains(annotation: Annotation, point: Point): boolean {
  if (annotation.geometry.type === 'rect') {
    return pointInRect(point, annotation.geometry)
  }
  return pointInPolygon(
    point,
    annotation.geometry.points.map(([x, y]) => ({ x, y })),
  )
}

function translateGeometry(
  geometry: RectGeometry | PolygonGeometry,
  delta: Point,
): RectGeometry | PolygonGeometry {
  if (geometry.type === 'rect') {
    return moveRect(geometry, delta)
  }
  return {
    type: 'polygon',
    points: geometry.points.map(([x, y]) => [x + delta.x, y + delta.y]),
  }
}

function sameGeometry(
  first: RectGeometry | PolygonGeometry,
  second: RectGeometry | PolygonGeometry,
): boolean {
  return JSON.stringify(first) === JSON.stringify(second)
}

function polygonVertexIsSeparated(
  geometry: PolygonGeometry,
  index: number,
  minimumDistance: number,
): boolean {
  const minimumSquared = minimumDistance * minimumDistance
  const point = geometry.points[index]
  return point !== undefined && geometry.points.every(
    ([x, y], otherIndex) =>
      index === otherIndex || squaredDistance(
        { x: point[0], y: point[1] },
        { x, y },
      ) >= minimumSquared,
  )
}

type DragMode =
  | { readonly type: 'move' }
  | { readonly type: 'polygon-vertex'; readonly index: number }
  | { readonly type: 'rect-handle'; readonly handle: RectHandle }

type SelectState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'dragging'
      readonly pointerId: number
      readonly annotation: Annotation
      readonly start: Point
      readonly mode: DragMode
      readonly currentGeometry: RectGeometry | PolygonGeometry
    }

function findHandleMode(
  annotation: Annotation,
  point: Point,
  tolerance: number,
): DragMode | null {
  const toleranceSquared = tolerance * tolerance
  if (annotation.geometry.type === 'polygon') {
    const index = annotation.geometry.points.findIndex(([x, y]) =>
      squaredDistance(point, { x, y }) <= toleranceSquared,
    )
    return index < 0 ? null : { type: 'polygon-vertex', index }
  }
  const handle = rectHandlePoints(annotation.geometry).find(([, handlePoint]) =>
    squaredDistance(point, handlePoint) <= toleranceSquared,
  )
  return handle === undefined
    ? null
    : { type: 'rect-handle', handle: handle[0] }
}

function geometryForPoint(state: Extract<SelectState, { phase: 'dragging' }>, point: Point) {
  if (state.mode.type === 'polygon-vertex') {
    if (state.annotation.geometry.type !== 'polygon') {
      return state.annotation.geometry
    }
    return movePolygonVertex(
      state.annotation.geometry,
      state.mode.index,
      point,
    )
  }
  if (state.mode.type === 'rect-handle') {
    if (state.annotation.geometry.type !== 'rect') {
      return state.annotation.geometry
    }
    return resizeRect(state.annotation.geometry, state.mode.handle, point)
  }
  return translateGeometry(state.annotation.geometry, {
    x: point.x - state.start.x,
    y: point.y - state.start.y,
  })
}

export function selectAnnotation(annotator: Annotator, id: string): void {
  const state = getInternalState(annotator)
  if (!state.annotationsById.has(id)) {
    throw new AnnotatorError(
      'ANNOTATION_NOT_FOUND',
      `Annotation not found: ${id}`,
    )
  }
  state.selectedIds = [id]
  state.renderer?.invalidate('interaction')
}

export function clearSelection(annotator: Annotator): void {
  const state = getInternalState(annotator)
  state.selectedIds = []
  state.renderer?.invalidate('interaction')
}

export function getSelection(annotator: Annotator): readonly string[] {
  return [...getInternalState(annotator).selectedIds]
}

export function createSelectTool(): Tool {
  let state: SelectState = { phase: 'idle' }
  let selectedVertex: { annotationId: string; index: number } | null = null

  return {
    id: 'select',
    cursor: 'default',
    handle(input: NormalizedPointerInput, context: ToolContext) {
      if (input.type === 'cancel') {
        state = { phase: 'idle' }
        context.clearDraft()
        return
      }
      if (input.type === 'down') {
        const internal = getInternalState(context.annotator)
        const tolerance = 8 / (internal.viewport?.scale ?? 1)
        const selected = internal.selectedIds[0] === undefined
          ? undefined
          : internal.annotationsById.get(internal.selectedIds[0])
        let annotation = selected
        let mode = selected === undefined
          ? null
          : findHandleMode(selected, input.imagePoint, tolerance)

        if (mode === null) {
          const bounds: Bounds = {
            x: input.imagePoint.x - tolerance,
            y: input.imagePoint.y - tolerance,
            width: tolerance * 2,
            height: tolerance * 2,
          }
          annotation = queryAnnotations(context.annotator, bounds)
            .reverse()
            .find(candidate => annotationContains(candidate, input.imagePoint))
          mode = annotation === undefined
            ? null
            : findHandleMode(annotation, input.imagePoint, tolerance) ?? { type: 'move' }
        }
        if (annotation === undefined || mode === null) {
          selectedVertex = null
          clearSelection(context.annotator)
          return
        }
        selectAnnotation(context.annotator, annotation.id)
        selectedVertex = mode.type === 'polygon-vertex'
          ? { annotationId: annotation.id, index: mode.index }
          : null
        state = {
          phase: 'dragging',
          pointerId: input.pointerId,
          annotation,
          start: input.imagePoint,
          mode,
          currentGeometry: annotation.geometry,
        }
        return
      }
      if (state.phase !== 'dragging' || input.pointerId !== state.pointerId) {
        return
      }
      const geometry = geometryForPoint(state, input.imagePoint)
      state = { ...state, currentGeometry: geometry }
      if (input.type === 'move') {
        context.setDraft({
          type: 'vector',
          annotationId: state.annotation.id,
          geometry,
          labelId: state.annotation.labelId,
        })
        return
      }
      const minimumImageSize = 1 / (
        getInternalState(context.annotator).viewport?.scale ?? 1
      )
      const valid = geometry.type === 'rect'
        ? geometry.width >= minimumImageSize &&
          geometry.height >= minimumImageSize
        : validatePolygon(
            geometry.points.map(([x, y]) => ({ x, y })),
          ).valid && (
            state.mode.type !== 'polygon-vertex' ||
            polygonVertexIsSeparated(
              geometry,
              state.mode.index,
              minimumImageSize,
            )
          )
      if (valid && !sameGeometry(state.annotation.geometry, geometry)) {
        updateAnnotation(context.annotator, state.annotation.id, geometry)
      }
      state = { phase: 'idle' }
      context.clearDraft()
    },
    handleKey(event, context) {
      const internal = getInternalState(context.annotator)
      const selectedId = internal.selectedIds[0]
      if (event.key === 'Delete' && selectedId !== undefined) {
        event.preventDefault()
        removeAnnotation(context.annotator, selectedId)
        selectedVertex = null
        clearSelection(context.annotator)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
      }
      if (event.key === 'Backspace' && selectedVertex !== null) {
        const annotation = internal.annotationsById.get(
          selectedVertex.annotationId,
        )
        if (annotation?.geometry.type !== 'polygon') {
          return
        }
        const geometry = removePolygonVertex(
          annotation.geometry,
          selectedVertex.index,
        )
        if (geometry !== null) {
          updateAnnotation(context.annotator, annotation.id, geometry)
          selectedVertex = null
          context.clearDraft()
        }
      }
    },
    cancel(context) {
      state = { phase: 'idle' }
      selectedVertex = null
      context.clearDraft()
    },
  }
}

export function useSelect(annotator: Annotator): void {
  activateTool(annotator, createSelectTool())
}

import { normalizeRect, pointInRect } from '../geometry/rect.js'
import { pointInPolygon, validatePolygon } from '../geometry/polygon.js'
import type { Bounds, Point } from '../geometry/types.js'
import {
  AnnotatorError,
  type Annotation,
  type Annotator,
  type MaskGeometry,
  type PolygonGeometry,
  type RectGeometry,
} from '../core/types.js'
import {
  queryAnnotations,
  removeAnnotation,
  updateAnnotation,
} from '../core/commands.js'
import { emitChange } from '../core/events.js'
import { getInternalState } from '../core/annotator.js'
import {
  binaryMasksWithinDistance,
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  mergeBinaryMasks,
  translateBinaryMask,
} from '../mask/rle.js'
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

export function getRectResizeHandleAtPoint(
  geometry: RectGeometry,
  point: Point,
  tolerance: number,
): RectHandle | null {
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  const withinX = point.x >= left - tolerance && point.x <= right + tolerance
  const withinY = point.y >= top - tolerance && point.y <= bottom + tolerance
  const nearLeft = Math.abs(point.x - left) <= tolerance && withinY
  const nearRight = Math.abs(point.x - right) <= tolerance && withinY
  const nearTop = Math.abs(point.y - top) <= tolerance && withinX
  const nearBottom = Math.abs(point.y - bottom) <= tolerance && withinX

  if (nearLeft && nearTop) {
    return 'north-west'
  }
  if (nearRight && nearTop) {
    return 'north-east'
  }
  if (nearRight && nearBottom) {
    return 'south-east'
  }
  if (nearLeft && nearBottom) {
    return 'south-west'
  }
  if (nearLeft) {
    return 'west'
  }
  if (nearRight) {
    return 'east'
  }
  if (nearTop) {
    return 'north'
  }
  if (nearBottom) {
    return 'south'
  }
  return null
}

function annotationContains(annotation: Annotation, point: Point): boolean {
  if (annotation.geometry.type === 'rect') {
    return pointInRect(point, annotation.geometry)
  }
  if (annotation.geometry.type === 'polygon') {
    return pointInPolygon(
      point,
      annotation.geometry.points.map(([x, y]) => ({ x, y })),
    )
  }
  if (annotation.geometry.type === 'mask') {
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    if (
      x < 0 ||
      y < 0 ||
      x >= annotation.geometry.width ||
      y >= annotation.geometry.height
    ) {
      return false
    }
    const mask = decodeBinaryMaskRle(
      annotation.geometry.rle,
      annotation.geometry.width,
      annotation.geometry.height,
    )
    return mask[y * annotation.geometry.width + x] === 1
  }
  return false
}

function translateGeometry(
  geometry: RectGeometry | PolygonGeometry | MaskGeometry,
  delta: Point,
): RectGeometry | PolygonGeometry | MaskGeometry {
  if (geometry.type === 'rect') {
    return moveRect(geometry, delta)
  }
  if (geometry.type === 'polygon') {
    return {
      type: 'polygon',
      points: geometry.points.map(([x, y]) => [x + delta.x, y + delta.y]),
    }
  }
  const mask = decodeBinaryMaskRle(
    geometry.rle,
    geometry.width,
    geometry.height,
  )
  return {
    type: 'mask',
    width: geometry.width,
    height: geometry.height,
    rle: encodeBinaryMaskRle(translateBinaryMask(
      mask,
      geometry.width,
      geometry.height,
      delta.x,
      delta.y,
    )),
  }
}

function updateAndMergeNearbyMasks(
  annotator: Annotator,
  annotation: Annotation,
  geometry: MaskGeometry,
  tolerance: number,
): void {
  let merged = decodeBinaryMaskRle(
    geometry.rle,
    geometry.width,
    geometry.height,
  )
  const nearby = queryAnnotations(annotator, {
    x: 0,
    y: 0,
    width: geometry.width,
    height: geometry.height,
  }).filter(candidate => {
    if (
      candidate.id === annotation.id ||
      candidate.labelId !== annotation.labelId ||
      candidate.geometry.type !== 'mask' ||
      candidate.geometry.width !== geometry.width ||
      candidate.geometry.height !== geometry.height
    ) {
      return false
    }
    return binaryMasksWithinDistance(
      merged,
      decodeBinaryMaskRle(
        candidate.geometry.rle,
        candidate.geometry.width,
        candidate.geometry.height,
      ),
      geometry.width,
      geometry.height,
      tolerance,
    )
  })
  for (const candidate of nearby) {
    if (candidate.geometry.type !== 'mask') {
      continue
    }
    merged = mergeBinaryMasks(merged, decodeBinaryMaskRle(
      candidate.geometry.rle,
      candidate.geometry.width,
      candidate.geometry.height,
    ))
  }
  updateAnnotation(annotator, annotation.id, {
    ...geometry,
    rle: encodeBinaryMaskRle(merged),
  })
  for (const candidate of nearby) {
    removeAnnotation(annotator, candidate.id)
  }
}

function sameGeometry(
  first: RectGeometry | PolygonGeometry | MaskGeometry,
  second: RectGeometry | PolygonGeometry | MaskGeometry,
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
      readonly currentGeometry: RectGeometry | PolygonGeometry | MaskGeometry
      readonly moved: boolean
      readonly clickTolerance: number
      readonly cycleOnClick: boolean
      readonly cycleIds: readonly string[]
      readonly cycleNextIndex: number
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
  if (annotation.geometry.type === 'rect') {
    const handle = rectHandlePoints(annotation.geometry).find(([, handlePoint]) =>
      squaredDistance(point, handlePoint) <= toleranceSquared,
    )
    const edgeHandle = handle === undefined
      ? getRectResizeHandleAtPoint(annotation.geometry, point, tolerance)
      : handle[0]
    return edgeHandle === null
      ? null
      : { type: 'rect-handle', handle: edgeHandle }
  }
  return null
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
  emitChange(annotator, 'selection:update')
}

export function clearSelection(annotator: Annotator): void {
  const state = getInternalState(annotator)
  const hadSelection = state.selectedIds.length > 0
  state.selectedIds = []
  state.renderer?.invalidate('interaction')
  if (hadSelection) {
    emitChange(annotator, 'selection:update')
  }
}

export function getSelection(annotator: Annotator): readonly string[] {
  return [...getInternalState(annotator).selectedIds]
}

export function createSelectTool(): Tool {
  let state: SelectState = { phase: 'idle' }
  let selectedVertex: { annotationId: string; index: number } | null = null

  return {
    id: 'select',
    name: '选择',
    description: '选择、移动和编辑标注',
    icon: '☝️',
    cursor: 'default',
    category: 'selection',
    shortcuts: [{ key: 's' }],
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
        let annotation: Annotation | undefined = selected
        let mode: DragMode | null = selected === undefined
          ? null
          : findHandleMode(selected, input.imagePoint, tolerance)

        const bounds: Bounds = {
          x: input.imagePoint.x - tolerance,
          y: input.imagePoint.y - tolerance,
          width: tolerance * 2,
          height: tolerance * 2,
        }
        const candidates = queryAnnotations(context.annotator, bounds)
          .reverse()
          .filter(candidate => annotationContains(candidate, input.imagePoint))
        const candidateIds = candidates.map(candidate => candidate.id)
        const selectedIndex = selected === undefined
          ? -1
          : candidateIds.indexOf(selected.id)
        let cycleOnClick = false
        let cycleNextIndex = 0
        if (mode === null) {
          const candidateIndex = selectedIndex >= 0 ? selectedIndex : 0
          annotation = candidates[candidateIndex]
          cycleOnClick = selectedIndex >= 0 && candidates.length > 1
          cycleNextIndex = candidates.length > 0
            ? (candidateIndex + 1) % candidates.length
            : 0
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
          moved: false,
          clickTolerance: tolerance,
          cycleOnClick,
          cycleIds: candidateIds,
          cycleNextIndex,
        }
        return
      }
      if (state.phase !== 'dragging' || input.pointerId !== state.pointerId) {
        return
      }
      const moved = state.moved ||
        squaredDistance(state.start, input.imagePoint) >
          state.clickTolerance * state.clickTolerance
      const geometry = geometryForPoint(state, input.imagePoint)
      state = { ...state, currentGeometry: geometry, moved }
      if (input.type === 'move') {
        context.setDraft({
          type: 'vector',
          annotationId: state.annotation.id,
          geometry,
          labelId: state.annotation.labelId,
        })
        return
      }
      if (!state.moved && state.cycleOnClick && state.cycleIds.length > 1) {
        const nextId = state.cycleIds[
          state.cycleNextIndex % state.cycleIds.length
        ]
        if (nextId !== undefined) {
          selectAnnotation(context.annotator, nextId)
        }
        state = { phase: 'idle' }
        context.clearDraft()
        return
      }
      const minimumImageSize = 1 / (
        getInternalState(context.annotator).viewport?.scale ?? 1
      )
      const valid = geometry.type === 'rect'
        ? geometry.width >= minimumImageSize &&
          geometry.height >= minimumImageSize
        : geometry.type === 'polygon'
          ? validatePolygon(
              geometry.points.map(([x, y]) => ({ x, y })),
            ).valid && (
              state.mode.type !== 'polygon-vertex' ||
              polygonVertexIsSeparated(
                geometry,
                state.mode.index,
                minimumImageSize,
              )
            )
          : true
      if (valid && !sameGeometry(state.annotation.geometry, geometry)) {
        if (geometry.type === 'mask') {
          updateAndMergeNearbyMasks(
            context.annotator,
            state.annotation,
            geometry,
            state.clickTolerance,
          )
        } else {
          updateAnnotation(context.annotator, state.annotation.id, geometry)
        }
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

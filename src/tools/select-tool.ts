import {
  getRectCenter,
  normalizeRect,
  normalizeRotation,
  pointInRotatedRect,
  rectLocalToWorld,
  rectWorldToLocal,
} from '../geometry/rect.js'
import { pointInPolygon, validatePolygon } from '../geometry/polygon.js'
import { pointInEllipse } from '../geometry/ellipse.js'
import { pointInPoint } from '../geometry/point.js'
import { pointInPolyline } from '../geometry/polyline.js'
import type { Bounds, Point } from '../geometry/types.js'
import {
  AnnotatorError,
  type Annotation,
  type AnnotationGeometry,
  type Annotator,
  type MaskGeometry,
  type PolygonGeometry,
  type PolylineGeometry,
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
import {
  findPolylineSegmentInsertionIndex,
  getEllipseHandleAtPoint,
  insertPolylineVertex,
  movePolylineVertex,
  removePolylineVertex,
  resizeEllipse,
  type EllipseHandle,
} from '../selection/vector-editing.js'
import { activateTool } from './controller.js'
import { removeAnnotations, translateAnnotations } from '../core/arrangement-commands.js'
import {
  copyAnnotations,
  duplicateAnnotations,
  pasteAnnotations,
} from '../core/clipboard.js'
import {
  selectAnnotations,
  selectAnnotationsInBounds,
  toggleAnnotationSelection,
} from '../selection/selection-commands.js'
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
  | 'rotate'

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
  if (handle === 'rotate') {
    return rotateRect(geometry, point)
  }
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  // 指针先回到矩形未旋转时的局部坐标，才能沿自身横轴和纵轴缩放。
  const localPoint = rectWorldToLocal(geometry, point)
  const movesWest = handle.includes('west')
  const movesEast = handle.includes('east')
  const movesNorth = handle.includes('north')
  const movesSouth = handle.includes('south')
  const start = {
    x: movesWest ? localPoint.x : left,
    y: movesNorth ? localPoint.y : top,
  }
  const end = {
    x: movesEast ? localPoint.x : right,
    y: movesSouth ? localPoint.y : bottom,
  }
  const localBounds = normalizeRect(start, end)
  const localCenter = {
    x: localBounds.x + localBounds.width / 2,
    y: localBounds.y + localBounds.height / 2,
  }
  const worldCenter = rectLocalToWorld(geometry, localCenter)
  return {
    type: 'rect',
    x: worldCenter.x - localBounds.width / 2,
    y: worldCenter.y - localBounds.height / 2,
    width: localBounds.width,
    height: localBounds.height,
    ...(geometry.rotation === undefined
      ? {}
      : { rotation: normalizeRotation(geometry.rotation) }),
  }
}

export function rotateRect(
  geometry: RectGeometry,
  point: Point,
): RectGeometry {
  const center = getRectCenter(geometry)
  // 零度旋转手柄位于正上方，因此 atan2 的结果需要顺时针补 90 度。
  const rotation = normalizeRotation(
    Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90,
  )
  return { ...geometry, rotation }
}

function squaredDistance(first: Point, second: Point): number {
  const x = first.x - second.x
  const y = first.y - second.y
  return x * x + y * y
}

export function getRectHandlePoints(
  geometry: RectGeometry,
  rotationHandleOffset: number,
): readonly [RectHandle, Point][] {
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2
  const localPoints: readonly [RectHandle, Point][] = [
    ['rotate', { x: centerX, y: top - rotationHandleOffset }],
    ['north-west', { x: left, y: top }],
    ['north', { x: centerX, y: top }],
    ['north-east', { x: right, y: top }],
    ['east', { x: right, y: centerY }],
    ['south-east', { x: right, y: bottom }],
    ['south', { x: centerX, y: bottom }],
    ['south-west', { x: left, y: bottom }],
    ['west', { x: left, y: centerY }],
  ]
  return localPoints.map(([handle, point]) => [
    handle,
    rectLocalToWorld(geometry, point),
  ])
}

export function getRectResizeHandleAtPoint(
  geometry: RectGeometry,
  point: Point,
  tolerance: number,
): RectHandle | null {
  const localPoint = rectWorldToLocal(geometry, point)
  const left = geometry.x
  const top = geometry.y
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  const withinX = localPoint.x >= left - tolerance && localPoint.x <= right + tolerance
  const withinY = localPoint.y >= top - tolerance && localPoint.y <= bottom + tolerance
  const nearLeft = Math.abs(localPoint.x - left) <= tolerance && withinY
  const nearRight = Math.abs(localPoint.x - right) <= tolerance && withinY
  const nearTop = Math.abs(localPoint.y - top) <= tolerance && withinX
  const nearBottom = Math.abs(localPoint.y - bottom) <= tolerance && withinX

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

function annotationContains(
  annotation: Annotation,
  point: Point,
  tolerance: number,
): boolean {
  // 空间索引只负责粗筛包围盒，这里再按真实几何做一次精确命中。
  if (annotation.geometry.type === 'rect') {
    return pointInRotatedRect(point, annotation.geometry)
  }
  if (annotation.geometry.type === 'polygon') {
    return pointInPolygon(
      point,
      annotation.geometry.points.map(([x, y]) => ({ x, y })),
    )
  }
  if (annotation.geometry.type === 'point') {
    return pointInPoint(point, annotation.geometry, tolerance)
  }
  if (annotation.geometry.type === 'polyline') {
    return pointInPolyline(point, annotation.geometry, tolerance)
  }
  if (annotation.geometry.type === 'ellipse') {
    return pointInEllipse(point, annotation.geometry)
  }
  if (annotation.geometry.type === 'mask') {
    // Mask 的 RLE 数据覆盖整张原图，命中判断必须读取对应像素，不能只看外接框。
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
  geometry: AnnotationGeometry,
  delta: Point,
): AnnotationGeometry {
  if (geometry.type === 'rect') {
    return moveRect(geometry, delta)
  }
  if (geometry.type === 'polygon') {
    return {
      type: 'polygon',
      points: geometry.points.map(([x, y]) => [x + delta.x, y + delta.y]),
    }
  }
  if (geometry.type === 'point') {
    return { type: 'point', x: geometry.x + delta.x, y: geometry.y + delta.y }
  }
  if (geometry.type === 'polyline') {
    return {
      type: 'polyline',
      points: geometry.points.map(([x, y]) => [x + delta.x, y + delta.y]),
    }
  }
  if (geometry.type === 'ellipse') {
    return {
      ...geometry,
      cx: geometry.cx + delta.x,
      cy: geometry.cy + delta.y,
    }
  }
  // Mask 没有单独的 x/y，移动时需要解码、平移像素，再重新编码。
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
  // 拖动结束后，同标签且距离足够近的 Mask 会并入当前标注。
  // 当前标注保留原 id，便于外部业务继续引用；被吸收的标注随后删除。
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
  first: AnnotationGeometry,
  second: AnnotationGeometry,
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

function polylineVertexIsSeparated(
  geometry: PolylineGeometry,
  index: number,
  minimumDistance: number,
): boolean {
  const current = geometry.points[index]
  if (current === undefined) {
    return false
  }
  const previous = geometry.points[index - 1]
  const next = geometry.points[index + 1]
  const minimumSquared = minimumDistance * minimumDistance
  return [previous, next].every(point => point === undefined || squaredDistance(
    { x: current[0], y: current[1] },
    { x: point[0], y: point[1] },
  ) >= minimumSquared)
}

type DragMode =
  | { readonly type: 'move' }
  | { readonly type: 'polygon-vertex'; readonly index: number }
  | { readonly type: 'polyline-vertex'; readonly index: number }
  | { readonly type: 'rect-handle'; readonly handle: RectHandle }
  | { readonly type: 'ellipse-handle'; readonly handle: EllipseHandle }

type SelectState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'dragging'
      readonly pointerId: number
      readonly annotation: Annotation
      readonly start: Point
      readonly mode: DragMode
      readonly currentGeometry: AnnotationGeometry
      readonly moved: boolean
      readonly clickTolerance: number
      readonly cycleOnClick: boolean
      readonly cycleIds: readonly string[]
      readonly cycleNextIndex: number
      readonly moveIds: readonly string[]
    }
  | {
      readonly phase: 'marquee'
      readonly pointerId: number
      readonly start: Point
      readonly current: Point
      readonly append: boolean
      readonly previousIds: readonly string[]
    }

function findHandleMode(
  annotation: Annotation,
  point: Point,
  tolerance: number,
): DragMode | null {
  // tolerance 使用图片坐标。调用方会除以缩放倍率，保证控制点在屏幕上始终好点中。
  const toleranceSquared = tolerance * tolerance
  if (annotation.geometry.type === 'polygon') {
    const index = annotation.geometry.points.findIndex(([x, y]) =>
      squaredDistance(point, { x, y }) <= toleranceSquared,
    )
    return index < 0 ? null : { type: 'polygon-vertex', index }
  }
  if (annotation.geometry.type === 'polyline') {
    const index = annotation.geometry.points.findIndex(([x, y]) =>
      squaredDistance(point, { x, y }) <= toleranceSquared,
    )
    return index < 0 ? null : { type: 'polyline-vertex', index }
  }
  if (annotation.geometry.type === 'rect') {
    const handle = getRectHandlePoints(annotation.geometry, tolerance * 3).find(([, handlePoint]) =>
      squaredDistance(point, handlePoint) <= toleranceSquared,
    )
    const edgeHandle = handle === undefined
      ? getRectResizeHandleAtPoint(annotation.geometry, point, tolerance)
      : handle[0]
    return edgeHandle === null
      ? null
      : { type: 'rect-handle', handle: edgeHandle }
  }
  if (annotation.geometry.type === 'ellipse') {
    const handle = getEllipseHandleAtPoint(
      annotation.geometry,
      point,
      tolerance,
    )
    return handle === null ? null : { type: 'ellipse-handle', handle }
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
  if (state.mode.type === 'polyline-vertex') {
    if (state.annotation.geometry.type !== 'polyline') {
      return state.annotation.geometry
    }
    return movePolylineVertex(
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
  if (state.mode.type === 'ellipse-handle') {
    if (state.annotation.geometry.type !== 'ellipse') {
      return state.annotation.geometry
    }
    return resizeEllipse(state.annotation.geometry, state.mode.handle, point)
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
  // 编辑过程只保存在工具内部状态和 interactionDraft 中，抬手后才写入标注数据。
  // 这样取消手势时无需回滚，也不会为每个 pointermove 生成一条历史记录。
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
        // 8px 是屏幕命中半径；换算为图片坐标后，缩放不会造成控制点错位或难以操作。
        const tolerance = 8 / (internal.viewport?.scale ?? 1)
        const selected = internal.selectedIds[0] === undefined
          ? undefined
          : internal.annotationsById.get(internal.selectedIds[0])
        let annotation: Annotation | undefined = selected
        let mode: DragMode | null = selected === undefined
          ? null
          : findHandleMode(selected, input.imagePoint, tolerance)

        // 已选中标注的控制点优先级最高，避免它被上层重叠标注抢走。
        const bounds: Bounds = {
          x: input.imagePoint.x - tolerance,
          y: input.imagePoint.y - tolerance,
          width: tolerance * 2,
          height: tolerance * 2,
        }
        const candidates = queryAnnotations(context.annotator, bounds)
          .reverse()
          .filter(candidate => candidate.hidden !== true)
          .filter(candidate => annotationContains(
            candidate,
            input.imagePoint,
            tolerance,
          ))
        const candidateIds = candidates.map(candidate => candidate.id)
        const selectedIndex = selected === undefined
          ? -1
          : candidateIds.indexOf(selected.id)
        let cycleOnClick = false
        let cycleNextIndex = 0
        if (mode === null) {
          // reverse 后先命中最上层；重复点击同一重叠区域时，从当前项继续向下轮选。
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
          state = {
            phase: 'marquee',
            pointerId: input.pointerId,
            start: input.imagePoint,
            current: input.imagePoint,
            append: input.shiftKey === true,
            previousIds: [...internal.selectedIds],
          }
          context.setDraft({
            type: 'selection',
            mode: 'marquee',
            points: [input.imagePoint, input.imagePoint],
          })
          return
        }
        if (
          input.detail >= 2 &&
          annotation.geometry.type === 'polyline' &&
          mode.type === 'move'
        ) {
          const insertionIndex = findPolylineSegmentInsertionIndex(
            annotation.geometry,
            input.imagePoint,
            tolerance,
          )
          if (insertionIndex !== null) {
            updateAnnotation(context.annotator, annotation.id, insertPolylineVertex(
              annotation.geometry,
              insertionIndex,
              input.imagePoint,
            ))
            selectAnnotation(context.annotator, annotation.id)
            selectedVertex = {
              annotationId: annotation.id,
              index: insertionIndex,
            }
            return
          }
        }
        const nextSelection = input.shiftKey === true
          ? toggleAnnotationSelection(context.annotator, annotation.id, {
              expandGroups: input.altKey !== true,
            })
          : selectAnnotations(context.annotator, [annotation.id], {
              expandGroups: input.altKey !== true,
            })
        if (!nextSelection.includes(annotation.id) || annotation.locked === true) {
          state = { phase: 'idle' }
          context.clearDraft()
          return
        }
        selectedVertex = mode.type === 'polygon-vertex' ||
          mode.type === 'polyline-vertex'
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
          moveIds: mode.type === 'move' ? nextSelection : [annotation.id],
        }
        return
      }
      if (state.phase === 'marquee') {
        if (input.pointerId !== state.pointerId) {
          return
        }
        const marqueeState = { ...state, current: input.imagePoint }
        state = marqueeState
        const bounds = normalizeRect(marqueeState.start, input.imagePoint)
        if (input.type === 'move') {
          context.setDraft({
            type: 'selection',
            mode: 'marquee',
            points: [
              marqueeState.start,
              { x: input.imagePoint.x, y: marqueeState.start.y },
              input.imagePoint,
              { x: marqueeState.start.x, y: input.imagePoint.y },
            ],
          })
          return
        }
        const tolerance = 2 / (
          getInternalState(context.annotator).viewport?.scale ?? 1
        )
        if (bounds.width <= tolerance && bounds.height <= tolerance) {
          if (!marqueeState.append) {
            clearSelection(context.annotator)
          }
        } else {
          const selected = selectAnnotationsInBounds(context.annotator, bounds)
          if (marqueeState.append) {
            selectAnnotations(context.annotator, [
              ...marqueeState.previousIds,
              ...selected,
            ])
          }
        }
        state = { phase: 'idle' }
        context.clearDraft()
        return
      }
      if (state.phase !== 'dragging' || input.pointerId !== state.pointerId) {
        return
      }
      const dragState = state
      const moved = dragState.moved ||
        squaredDistance(dragState.start, input.imagePoint) >
          dragState.clickTolerance * dragState.clickTolerance
      const geometry = geometryForPoint(dragState, input.imagePoint)
      const nextState = { ...dragState, currentGeometry: geometry, moved }
      state = nextState
      if (input.type === 'move') {
        // pointermove 只更新预览，真正的数据提交统一放在 pointerup。
        context.setDraft({
          type: 'vector',
          annotationId: nextState.annotation.id,
          geometry,
          labelId: nextState.annotation.labelId,
        })
        return
      }
      if (!nextState.moved && nextState.cycleOnClick && nextState.cycleIds.length > 1) {
        // 没有超过拖动阈值，说明这是点击：切换到重叠区域中的下一条标注。
        const nextId = nextState.cycleIds[
          nextState.cycleNextIndex % nextState.cycleIds.length
        ]
        if (nextId !== undefined) {
          selectAnnotations(context.annotator, [nextId], {
            expandGroups: input.altKey !== true,
          })
        }
        state = { phase: 'idle' }
        context.clearDraft()
        return
      }
      const minimumImageSize = 1 / (
        getInternalState(context.annotator).viewport?.scale ?? 1
      )
      // 最小尺寸同样以 1 个屏幕像素为准，防止缩放后生成退化矩形或重合顶点。
      const valid = geometry.type === 'rect'
        ? geometry.width >= minimumImageSize &&
          geometry.height >= minimumImageSize
          : geometry.type === 'polygon'
          ? validatePolygon(
              geometry.points.map(([x, y]) => ({ x, y })),
            ).valid && (
              nextState.mode.type !== 'polygon-vertex' ||
              polygonVertexIsSeparated(
                geometry,
                nextState.mode.index,
                minimumImageSize,
              )
            )
          : geometry.type === 'polyline'
            ? nextState.mode.type !== 'polyline-vertex' ||
              polylineVertexIsSeparated(
                geometry,
                nextState.mode.index,
                minimumImageSize,
              )
          : true
      if (
        valid &&
        nextState.mode.type === 'move' &&
        nextState.moveIds.length > 1 &&
        nextState.moved
      ) {
        translateAnnotations(context.annotator, nextState.moveIds, {
          x: input.imagePoint.x - nextState.start.x,
          y: input.imagePoint.y - nextState.start.y,
        })
        state = { phase: 'idle' }
        context.clearDraft()
        return
      }
      if (valid && !sameGeometry(nextState.annotation.geometry, geometry)) {
        if (geometry.type === 'mask') {
          // Mask 移动后可能靠近同标签区域，抬手时执行一次合并。
          updateAndMergeNearbyMasks(
            context.annotator,
            nextState.annotation,
            geometry,
            nextState.clickTolerance,
          )
        } else {
          updateAnnotation(context.annotator, nextState.annotation.id, geometry)
        }
      }
      state = { phase: 'idle' }
      context.clearDraft()
    },
    handleKey(event, context) {
      const internal = getInternalState(context.annotator)
      const selectedId = internal.selectedIds[0]
      const commandKey = event.ctrlKey || event.metaKey
      if (commandKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copyAnnotations(context.annotator, internal.selectedIds)
        return
      }
      if (commandKey && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteAnnotations(context.annotator)
        return
      }
      if (commandKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateAnnotations(context.annotator, internal.selectedIds)
        return
      }
      if (event.key === 'Delete' && selectedId !== undefined) {
        event.preventDefault()
        removeAnnotations(context.annotator, internal.selectedIds)
        selectedVertex = null
        clearSelection(context.annotator)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
      }
      if (event.key === 'Backspace' && selectedVertex !== null) {
        // Backspace 只删除当前选中的多边形顶点；至少保留三个点，并再次校验多边形。
        const annotation = internal.annotationsById.get(
          selectedVertex.annotationId,
        )
        if (annotation?.geometry.type === 'polyline') {
          const geometry = removePolylineVertex(
            annotation.geometry,
            selectedVertex.index,
          )
          if (geometry !== null) {
            updateAnnotation(context.annotator, annotation.id, geometry)
            selectedVertex = null
            context.clearDraft()
          }
          return
        }
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

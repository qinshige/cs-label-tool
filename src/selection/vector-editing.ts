import type {
  EllipseGeometry,
  PolylineGeometry,
} from '../core/types.js'
import {
  ellipseLocalToWorld,
  ellipseWorldToLocal,
} from '../geometry/ellipse.js'
import { pointToSegmentDistance } from '../geometry/polyline.js'
import { normalizeRotation } from '../geometry/rect.js'
import type { Point } from '../geometry/types.js'

export type EllipseHandle =
  | 'east'
  | 'north'
  | 'north-east'
  | 'north-west'
  | 'south'
  | 'south-east'
  | 'south-west'
  | 'west'
  | 'rotate'

export function movePolylineVertex(
  geometry: PolylineGeometry,
  index: number,
  point: Point,
): PolylineGeometry {
  return {
    type: 'polyline',
    points: geometry.points.map((current, currentIndex) =>
      currentIndex === index ? [point.x, point.y] as const : current,
    ),
  }
}

export function removePolylineVertex(
  geometry: PolylineGeometry,
  index: number,
): PolylineGeometry | null {
  if (
    geometry.points.length <= 2 ||
    index < 0 ||
    index >= geometry.points.length
  ) {
    return null
  }
  return {
    type: 'polyline',
    points: geometry.points.filter((_, currentIndex) => currentIndex !== index),
  }
}

export function insertPolylineVertex(
  geometry: PolylineGeometry,
  index: number,
  point: Point,
): PolylineGeometry {
  const points = geometry.points.map(current => [...current] as [number, number])
  points.splice(index, 0, [point.x, point.y])
  return { type: 'polyline', points }
}

export function findPolylineSegmentInsertionIndex(
  geometry: PolylineGeometry,
  point: Point,
  tolerance: number,
): number | null {
  let nearestIndex: number | null = null
  let nearestDistance = tolerance
  for (let index = 1; index < geometry.points.length; index += 1) {
    const start = geometry.points[index - 1]
    const end = geometry.points[index]
    if (start === undefined || end === undefined) {
      continue
    }
    const distance = pointToSegmentDistance(
      point,
      { x: start[0], y: start[1] },
      { x: end[0], y: end[1] },
    )
    if (distance <= nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  }
  return nearestIndex
}

export function getEllipseHandlePoints(
  geometry: EllipseGeometry,
  rotationHandleOffset: number,
): readonly [EllipseHandle, Point][] {
  const left = geometry.cx - geometry.radiusX
  const right = geometry.cx + geometry.radiusX
  const top = geometry.cy - geometry.radiusY
  const bottom = geometry.cy + geometry.radiusY
  const localPoints: readonly [EllipseHandle, Point][] = [
    ['rotate', { x: geometry.cx, y: top - rotationHandleOffset }],
    ['north-west', { x: left, y: top }],
    ['north', { x: geometry.cx, y: top }],
    ['north-east', { x: right, y: top }],
    ['east', { x: right, y: geometry.cy }],
    ['south-east', { x: right, y: bottom }],
    ['south', { x: geometry.cx, y: bottom }],
    ['south-west', { x: left, y: bottom }],
    ['west', { x: left, y: geometry.cy }],
  ]
  return localPoints.map(([handle, point]) => [
    handle,
    ellipseLocalToWorld(geometry, point),
  ])
}

export function getEllipseHandleAtPoint(
  geometry: EllipseGeometry,
  point: Point,
  tolerance: number,
): EllipseHandle | null {
  const toleranceSquared = tolerance * tolerance
  const handle = getEllipseHandlePoints(geometry, tolerance * 3).find(
    ([, handlePoint]) => {
      const x = point.x - handlePoint.x
      const y = point.y - handlePoint.y
      return x * x + y * y <= toleranceSquared
    },
  )
  return handle?.[0] ?? null
}

export function resizeEllipse(
  geometry: EllipseGeometry,
  handle: EllipseHandle,
  point: Point,
): EllipseGeometry {
  if (handle === 'rotate') {
    return rotateEllipse(geometry, point)
  }
  const localPoint = ellipseWorldToLocal(geometry, point)
  const left = geometry.cx - geometry.radiusX
  const right = geometry.cx + geometry.radiusX
  const top = geometry.cy - geometry.radiusY
  const bottom = geometry.cy + geometry.radiusY
  const movesWest = handle.includes('west')
  const movesEast = handle.includes('east')
  const movesNorth = handle.includes('north')
  const movesSouth = handle.includes('south')
  const nextLeft = movesWest ? localPoint.x : left
  const nextRight = movesEast ? localPoint.x : right
  const nextTop = movesNorth ? localPoint.y : top
  const nextBottom = movesSouth ? localPoint.y : bottom
  const localCenter = {
    x: (nextLeft + nextRight) / 2,
    y: (nextTop + nextBottom) / 2,
  }
  const worldCenter = ellipseLocalToWorld(geometry, localCenter)
  return {
    type: 'ellipse',
    cx: worldCenter.x,
    cy: worldCenter.y,
    radiusX: Math.abs(nextRight - nextLeft) / 2,
    radiusY: Math.abs(nextBottom - nextTop) / 2,
    ...(geometry.rotation === undefined
      ? {}
      : { rotation: normalizeRotation(geometry.rotation) }),
  }
}

export function rotateEllipse(
  geometry: EllipseGeometry,
  point: Point,
): EllipseGeometry {
  const rotation = normalizeRotation(
    Math.atan2(point.y - geometry.cy, point.x - geometry.cx) * 180 / Math.PI + 90,
  )
  return { ...geometry, rotation }
}

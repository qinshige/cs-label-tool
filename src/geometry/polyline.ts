import type { PolylineGeometry } from '../core/types.js'
import type { Bounds, Point } from './types.js'

export function pointToSegmentDistance(
  point: Point,
  start: Point,
  end: Point,
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }
  const ratio = Math.max(0, Math.min(1, (
    (point.x - start.x) * dx + (point.y - start.y) * dy
  ) / lengthSquared))
  return Math.hypot(
    point.x - (start.x + ratio * dx),
    point.y - (start.y + ratio * dy),
  )
}

export function pointInPolyline(
  point: Point,
  geometry: PolylineGeometry,
  tolerance: number,
): boolean {
  for (let index = 1; index < geometry.points.length; index += 1) {
    const previous = geometry.points[index - 1]
    const current = geometry.points[index]
    if (
      previous !== undefined &&
      current !== undefined &&
      pointToSegmentDistance(
        point,
        { x: previous[0], y: previous[1] },
        { x: current[0], y: current[1] },
      ) <= tolerance
    ) {
      return true
    }
  }
  return false
}

export function getPolylineBounds(geometry: PolylineGeometry): Bounds {
  const xs = geometry.points.map(point => point[0])
  const ys = geometry.points.map(point => point[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
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

export function removePolylineVertex(
  geometry: PolylineGeometry,
  index: number,
): PolylineGeometry | null {
  if (geometry.points.length <= 2 || index < 0 || index >= geometry.points.length) {
    return null
  }
  return {
    type: 'polyline',
    points: geometry.points.filter((_, currentIndex) => currentIndex !== index),
  }
}

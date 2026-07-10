import type { Point } from './types.js'

export type PolygonValidation =
  | { readonly valid: true }
  | {
      readonly valid: false
      readonly reason: 'TOO_FEW_POINTS' | 'NON_FINITE_POINT'
    }

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const cross =
    (point.y - start.y) * (end.x - start.x) -
    (point.x - start.x) * (end.y - start.y)
  if (Math.abs(cross) > Number.EPSILON * 16) {
    return false
  }

  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  )
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) {
    return false
  }

  let inside = false
  for (let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1) {
    const current = polygon[currentIndex]
    const previous = polygon[previousIndex]
    if (current === undefined || previous === undefined) {
      continue
    }
    if (pointOnSegment(point, previous, current)) {
      return true
    }

    const crossesRay =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x
    if (crossesRay) {
      inside = !inside
    }
  }
  return inside
}

export function validatePolygon(
  polygon: readonly Point[],
): PolygonValidation {
  if (polygon.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return { valid: false, reason: 'NON_FINITE_POINT' }
  }

  const uniquePoints = new Set(polygon.map(point => `${point.x}:${point.y}`))
  if (uniquePoints.size < 3) {
    return { valid: false, reason: 'TOO_FEW_POINTS' }
  }
  return { valid: true }
}

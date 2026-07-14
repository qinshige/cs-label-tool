import { AnnotatorError } from '../core/types.js'
import type { Bounds, Point } from './types.js'

function assertFinitePoint(point: Point): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Point coordinates must be finite.',
    )
  }
}

export function normalizeRect(start: Point, end: Point): Bounds {
  assertFinitePoint(start)
  assertFinitePoint(end)

  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return {
    x,
    y,
    width: Math.max(start.x, end.x) - x,
    height: Math.max(start.y, end.y) - y,
  }
}

export function pointInRect(point: Point, rect: Bounds): boolean {
  assertFinitePoint(point)
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

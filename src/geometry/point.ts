import type { PointGeometry } from '../core/types.js'
import type { Point } from './types.js'

export function pointDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

export function pointInPoint(
  point: Point,
  geometry: PointGeometry,
  tolerance: number,
): boolean {
  return pointDistance(point, geometry) <= tolerance
}

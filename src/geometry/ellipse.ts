import type { EllipseGeometry } from '../core/types.js'
import { normalizeRotation } from './rect.js'
import type { Bounds, Point } from './types.js'

function cleanFloat(value: number): number {
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 1e-12 ? rounded : value
}

function rotateAround(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const x = point.x - center.x
  const y = point.y - center.y
  return {
    x: cleanFloat(center.x + x * cosine - y * sine),
    y: cleanFloat(center.y + x * sine + y * cosine),
  }
}

export function ellipseLocalToWorld(
  geometry: EllipseGeometry,
  point: Point,
): Point {
  return rotateAround(
    point,
    { x: geometry.cx, y: geometry.cy },
    normalizeRotation(geometry.rotation),
  )
}

export function ellipseWorldToLocal(
  geometry: EllipseGeometry,
  point: Point,
): Point {
  return rotateAround(
    point,
    { x: geometry.cx, y: geometry.cy },
    -normalizeRotation(geometry.rotation),
  )
}

export function pointInEllipse(point: Point, geometry: EllipseGeometry): boolean {
  const local = ellipseWorldToLocal(geometry, point)
  const x = (local.x - geometry.cx) / geometry.radiusX
  const y = (local.y - geometry.cy) / geometry.radiusY
  return x * x + y * y <= 1
}

export function getEllipseBounds(geometry: EllipseGeometry): Bounds {
  const radians = normalizeRotation(geometry.rotation) * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const halfWidth = Math.sqrt(
    geometry.radiusX ** 2 * cosine ** 2 + geometry.radiusY ** 2 * sine ** 2,
  )
  const halfHeight = Math.sqrt(
    geometry.radiusX ** 2 * sine ** 2 + geometry.radiusY ** 2 * cosine ** 2,
  )
  return {
    x: cleanFloat(geometry.cx - halfWidth),
    y: cleanFloat(geometry.cy - halfHeight),
    width: cleanFloat(halfWidth * 2),
    height: cleanFloat(halfHeight * 2),
  }
}

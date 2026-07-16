import { AnnotatorError } from '../core/types.js'
import type { RectGeometry } from '../core/types.js'
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

function assertFiniteRotation(rotation: number): void {
  if (!Number.isFinite(rotation)) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Rectangle rotation must be finite.',
    )
  }
}

function cleanFloat(value: number): number {
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 1e-12 ? rounded : value
}

/** 把任意角度收敛到一圈内，便于持久化、比较和导出。 */
export function normalizeRotation(rotation = 0): number {
  assertFiniteRotation(rotation)
  const normalized = rotation % 360
  return cleanFloat(normalized < 0 ? normalized + 360 : normalized)
}

export function getRectCenter(rect: RectGeometry): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

function rotateAround(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const deltaX = point.x - center.x
  const deltaY = point.y - center.y
  return {
    x: cleanFloat(center.x + deltaX * cosine - deltaY * sine),
    y: cleanFloat(center.y + deltaX * sine + deltaY * cosine),
  }
}

/** 把未旋转矩形上的点转换到图片坐标。 */
export function rectLocalToWorld(rect: RectGeometry, point: Point): Point {
  assertFinitePoint(point)
  return rotateAround(point, getRectCenter(rect), normalizeRotation(rect.rotation))
}

/** 把图片坐标反向转换到未旋转矩形的局部坐标。 */
export function rectWorldToLocal(rect: RectGeometry, point: Point): Point {
  assertFinitePoint(point)
  return rotateAround(point, getRectCenter(rect), -normalizeRotation(rect.rotation))
}

export function getRotatedRectCorners(rect: RectGeometry): readonly Point[] {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  return [
    { x: rect.x, y: rect.y },
    { x: right, y: rect.y },
    { x: right, y: bottom },
    { x: rect.x, y: bottom },
  ].map(point => rectLocalToWorld(rect, point))
}

/** 空间索引仍使用轴对齐包围盒，但范围必须包含旋转后的四个顶点。 */
export function getRotatedRectBounds(rect: RectGeometry): Bounds {
  const corners = getRotatedRectCorners(rect)
  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    width: cleanFloat(maxX - minX),
    height: cleanFloat(maxY - minY),
  }
}

export function pointInRotatedRect(point: Point, rect: RectGeometry): boolean {
  return pointInRect(rectWorldToLocal(rect, point), rect)
}

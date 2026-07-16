import type { Annotation, AnnotationGeometry } from '../core/types.js'
import { ellipseLocalToWorld, pointInEllipse } from '../geometry/ellipse.js'
import { pointInPolygon } from '../geometry/polygon.js'
import { getRotatedRectCorners, pointInRotatedRect } from '../geometry/rect.js'
import { pointInRect } from '../geometry/rect.js'
import type { Bounds, Point } from '../geometry/types.js'
import { decodeBinaryMaskRle } from '../mask/rle.js'

type Segment = readonly [Point, Point]

function orientation(first: Point, second: Point, third: Point): number {
  return (second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x)
}

function segmentIntersects(first: Segment, second: Segment): boolean {
  const [a, b] = first
  const [c, d] = second
  const firstSide = orientation(a, b, c)
  const secondSide = orientation(a, b, d)
  const thirdSide = orientation(c, d, a)
  const fourthSide = orientation(c, d, b)
  return firstSide * secondSide <= 0 && thirdSide * fourthSide <= 0 &&
    Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
    Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
}

function pointsToSegments(points: readonly Point[], closed: boolean): Segment[] {
  const segments: Segment[] = []
  for (let index = 1; index < points.length; index += 1) {
    segments.push([points[index - 1]!, points[index]!])
  }
  if (closed && points.length > 2) {
    segments.push([points.at(-1)!, points[0]!])
  }
  return segments
}

function ellipsePoints(geometry: Extract<AnnotationGeometry, { type: 'ellipse' }>): Point[] {
  return Array.from({ length: 48 }, (_, index) => {
    const angle = index / 48 * Math.PI * 2
    return ellipseLocalToWorld(geometry, {
      x: geometry.cx + Math.cos(angle) * geometry.radiusX,
      y: geometry.cy + Math.sin(angle) * geometry.radiusY,
    })
  })
}

function geometryPath(geometry: AnnotationGeometry): {
  points: readonly Point[]
  closed: boolean
} {
  if (geometry.type === 'point') {
    return { points: [{ x: geometry.x, y: geometry.y }], closed: false }
  }
  if (geometry.type === 'rect') {
    return { points: getRotatedRectCorners(geometry), closed: true }
  }
  if (geometry.type === 'polygon') {
    return {
      points: geometry.points.map(([x, y]) => ({ x, y })),
      closed: true,
    }
  }
  if (geometry.type === 'polyline') {
    return {
      points: geometry.points.map(([x, y]) => ({ x, y })),
      closed: false,
    }
  }
  if (geometry.type === 'ellipse') {
    return { points: ellipsePoints(geometry), closed: true }
  }
  return { points: [], closed: false }
}

function geometryContainsPoint(geometry: AnnotationGeometry, point: Point): boolean {
  if (geometry.type === 'rect') {
    return pointInRotatedRect(point, geometry)
  }
  if (geometry.type === 'polygon') {
    return pointInPolygon(point, geometry.points.map(([x, y]) => ({ x, y })))
  }
  if (geometry.type === 'ellipse') {
    return pointInEllipse(point, geometry)
  }
  return false
}

function maskHasPixelInBounds(
  geometry: Extract<AnnotationGeometry, { type: 'mask' }>,
  bounds: Bounds,
): boolean {
  const mask = decodeBinaryMaskRle(geometry.rle, geometry.width, geometry.height)
  const left = Math.max(0, Math.floor(bounds.x))
  const top = Math.max(0, Math.floor(bounds.y))
  const right = Math.min(geometry.width - 1, Math.ceil(bounds.x + bounds.width))
  const bottom = Math.min(geometry.height - 1, Math.ceil(bounds.y + bounds.height))
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (mask[y * geometry.width + x] === 1) {
        return true
      }
    }
  }
  return false
}

export function annotationIntersectsBounds(
  annotation: Annotation,
  bounds: Bounds,
): boolean {
  if (annotation.hidden === true) {
    return false
  }
  if (annotation.geometry.type === 'mask') {
    return maskHasPixelInBounds(annotation.geometry, bounds)
  }
  const path = geometryPath(annotation.geometry)
  if (path.points.some(point => pointInRect(point, bounds))) {
    return true
  }
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ]
  if (corners.some(point => geometryContainsPoint(annotation.geometry, point))) {
    return true
  }
  const boundsSegments = pointsToSegments(corners, true)
  return pointsToSegments(path.points, path.closed).some(segment =>
    boundsSegments.some(edge => segmentIntersects(segment, edge)),
  )
}

export function annotationIntersectsLasso(
  annotation: Annotation,
  lasso: readonly Point[],
): boolean {
  if (annotation.hidden === true || lasso.length < 3) {
    return false
  }
  if (annotation.geometry.type === 'mask') {
    const mask = decodeBinaryMaskRle(
      annotation.geometry.rle,
      annotation.geometry.width,
      annotation.geometry.height,
    )
    for (let y = 0; y < annotation.geometry.height; y += 1) {
      for (let x = 0; x < annotation.geometry.width; x += 1) {
        if (
          mask[y * annotation.geometry.width + x] === 1 &&
          pointInPolygon({ x, y }, lasso)
        ) {
          return true
        }
      }
    }
    return false
  }
  const path = geometryPath(annotation.geometry)
  if (path.points.some(point => pointInPolygon(point, lasso))) {
    return true
  }
  if (lasso.some(point => geometryContainsPoint(annotation.geometry, point))) {
    return true
  }
  const lassoSegments = pointsToSegments(lasso, true)
  return pointsToSegments(path.points, path.closed).some(segment =>
    lassoSegments.some(edge => segmentIntersects(segment, edge)),
  )
}

import type { Point } from './types.js'

export type PolygonValidation =
  | { readonly valid: true }
  | {
      readonly valid: false
      readonly reason:
        | 'NON_FINITE_POINT'
        | 'SELF_INTERSECTION'
        | 'TOO_FEW_POINTS'
        | 'ZERO_AREA'
    }

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const firstProduct = (point.y - start.y) * (end.x - start.x)
  const secondProduct = (point.x - start.x) * (end.y - start.y)
  const cross = firstProduct - secondProduct
  const tolerance = Number.EPSILON * 16 * Math.max(
    1,
    Math.abs(firstProduct) + Math.abs(secondProduct),
  )
  if (Math.abs(cross) > tolerance) {
    return false
  }

  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  )
}

function orientation(start: Point, end: Point, point: Point): -1 | 0 | 1 {
  const firstProduct = (end.y - start.y) * (point.x - end.x)
  const secondProduct = (end.x - start.x) * (point.y - end.y)
  const value = firstProduct - secondProduct
  const tolerance = Number.EPSILON * 16 * Math.max(
    1,
    Math.abs(firstProduct) + Math.abs(secondProduct),
  )
  return Math.abs(value) <= tolerance ? 0 : value > 0 ? 1 : -1
}

function segmentsIntersect(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean {
  const first = orientation(firstStart, firstEnd, secondStart)
  const second = orientation(firstStart, firstEnd, secondEnd)
  const third = orientation(secondStart, secondEnd, firstStart)
  const fourth = orientation(secondStart, secondEnd, firstEnd)
  if (first !== 0 && second !== 0 && third !== 0 && fourth !== 0) {
    return first !== second && third !== fourth
  }
  return (
    (first === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) ||
    (second === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) ||
    (third === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) ||
    (fourth === 0 && pointOnSegment(firstEnd, secondStart, secondEnd))
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

  for (let first = 0; first < polygon.length; first += 1) {
    const firstNext = (first + 1) % polygon.length
    for (let second = first + 1; second < polygon.length; second += 1) {
      const secondNext = (second + 1) % polygon.length
      const adjacent =
        first === second ||
        firstNext === second ||
        secondNext === first
      if (adjacent) {
        continue
      }
      const firstStart = polygon[first]
      const firstEnd = polygon[firstNext]
      const secondStart = polygon[second]
      const secondEnd = polygon[secondNext]
      if (
        firstStart !== undefined &&
        firstEnd !== undefined &&
        secondStart !== undefined &&
        secondEnd !== undefined &&
        segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)
      ) {
        return { valid: false, reason: 'SELF_INTERSECTION' }
      }
    }
  }

  const twiceArea = polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length]
    return next === undefined
      ? sum
      : sum + point.x * next.y - next.x * point.y
  }, 0)
  if (Math.abs(twiceArea) <= Number.EPSILON) {
    return { valid: false, reason: 'ZERO_AREA' }
  }
  return { valid: true }
}

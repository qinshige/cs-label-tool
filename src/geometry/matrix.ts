import { AnnotatorError } from '../core/types.js'
import type { Matrix2D, Point } from './types.js'

export function createScaleTranslateMatrix(
  scale: number,
  offsetX: number,
  offsetY: number,
): Matrix2D {
  if (![scale, offsetX, offsetY].every(Number.isFinite) || scale <= 0) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Matrix scale must be positive and all values must be finite.',
    )
  }
  return { a: scale, b: 0, c: 0, d: scale, e: offsetX, f: offsetY }
}

export function invertMatrix(matrix: Matrix2D): Matrix2D {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (!Number.isFinite(determinant) || determinant === 0) {
    throw new AnnotatorError('INVALID_GEOMETRY', 'Matrix is not invertible.')
  }

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  }
}

export function transformPoint(matrix: Matrix2D, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

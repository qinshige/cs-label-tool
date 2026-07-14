import { AnnotatorError } from '../core/types.js'
import {
  createScaleTranslateMatrix,
  invertMatrix,
  transformPoint,
} from '../geometry/matrix.js'
import type { Point, Size } from '../geometry/types.js'

export interface ViewportOptions extends Size {
  readonly minScale?: number
  readonly maxScale?: number
}

export interface ViewportState extends Size {
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
  readonly minScale: number
  readonly maxScale: number
}

function assertPositiveSize(size: Size, name: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      `${name} dimensions must be finite and positive.`,
    )
  }
}

function clampScale(viewport: ViewportState, scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Viewport scale must be finite and positive.',
    )
  }
  return Math.min(viewport.maxScale, Math.max(viewport.minScale, scale))
}

export function createViewport(options: ViewportOptions): ViewportState {
  assertPositiveSize(options, 'Viewport')
  const minScale = options.minScale ?? 0.01
  const maxScale = options.maxScale ?? 64
  if (minScale <= 0 || maxScale < minScale) {
    throw new AnnotatorError(
      'INVALID_GEOMETRY',
      'Viewport scale limits must be positive and ordered.',
    )
  }
  return {
    width: options.width,
    height: options.height,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale,
    maxScale,
  }
}

export function imageToScreen(viewport: ViewportState, point: Point): Point {
  return transformPoint(
    createScaleTranslateMatrix(
      viewport.scale,
      viewport.offsetX,
      viewport.offsetY,
    ),
    point,
  )
}

/** screenToImage 与 imageToScreen 使用同一矩阵的逆变换，避免两套公式产生误差。 */
export function screenToImage(viewport: ViewportState, point: Point): Point {
  return transformPoint(
    invertMatrix(
      createScaleTranslateMatrix(
        viewport.scale,
        viewport.offsetX,
        viewport.offsetY,
      ),
    ),
    point,
  )
}

export function zoomAt(
  viewport: ViewportState,
  screenAnchor: Point,
  requestedScale: number,
): ViewportState {
  // 先记录锚点对应的原图坐标，再反推新 offset，保证缩放前后锚点不跳动。
  const imageAnchor = screenToImage(viewport, screenAnchor)
  const scale = clampScale(viewport, requestedScale)
  return {
    ...viewport,
    scale,
    offsetX: screenAnchor.x - imageAnchor.x * scale,
    offsetY: screenAnchor.y - imageAnchor.y * scale,
  }
}

export function panViewport(
  viewport: ViewportState,
  delta: Point,
): ViewportState {
  return {
    ...viewport,
    offsetX: viewport.offsetX + delta.x,
    offsetY: viewport.offsetY + delta.y,
  }
}

export function fitViewport(
  viewport: ViewportState,
  imageSize: Size,
): ViewportState {
  assertPositiveSize(imageSize, 'Image')
  const scale = clampScale(
    viewport,
    Math.min(
      viewport.width / imageSize.width,
      viewport.height / imageSize.height,
    ),
  )
  // 使用同一个 scale 等比缩放，并把剩余空间平均分到两侧。
  return {
    ...viewport,
    scale,
    offsetX: (viewport.width - imageSize.width * scale) / 2,
    offsetY: (viewport.height - imageSize.height * scale) / 2,
  }
}

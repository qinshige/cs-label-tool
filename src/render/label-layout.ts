import type { PointGeometry } from '../core/types.js'

export interface PointLabelLayout {
  readonly x: number
  readonly y: number
  readonly fontSize: number
  readonly padding: number
}

export function getPointLabelLayout(
  geometry: PointGeometry,
  scale: number,
): PointLabelLayout {
  // 点标签使用屏幕像素尺寸，并固定放到点的右侧，避免标签背景盖住点。
  return {
    x: geometry.x + 10 / scale,
    y: geometry.y + 5 / scale,
    fontSize: 11 / scale,
    padding: 3 / scale,
  }
}

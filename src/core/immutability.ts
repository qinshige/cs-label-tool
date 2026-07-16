import type {
  Annotation,
  EllipseGeometry,
  MaskGeometry,
  PointGeometry,
  PolygonGeometry,
  PolylineGeometry,
  RectGeometry,
} from './types.js'

type Geometry =
  | RectGeometry
  | PolygonGeometry
  | MaskGeometry
  | PointGeometry
  | PolylineGeometry
  | EllipseGeometry

function deepFreeze(value: unknown, seen = new WeakSet<object>()): unknown {
  // metadata 可能存在共享引用，WeakSet 用来避免重复遍历和循环引用导致死递归。
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value
  }
  seen.add(value)
  for (const child of Object.values(value)) {
    deepFreeze(child, seen)
  }
  return Object.freeze(value)
}

export function cloneGeometry(
  geometry: Geometry,
): Geometry {
  // 对外快照既要复制容器，也要冻结 points/rle 等内部数组，防止调用方改写内部状态。
  if (geometry.type === 'rect') {
    return Object.freeze({ ...geometry })
  }
  if (geometry.type === 'polygon') {
    return Object.freeze({
      type: 'polygon' as const,
      points: Object.freeze(
        geometry.points.map(([x, y]) => Object.freeze([x, y] as const)),
      ),
    })
  }
  if (geometry.type === 'polyline') {
    return Object.freeze({
      type: 'polyline' as const,
      points: Object.freeze(
        geometry.points.map(([x, y]) => Object.freeze([x, y] as const)),
      ),
    })
  }
  if (geometry.type === 'point' || geometry.type === 'ellipse') {
    return Object.freeze({ ...geometry })
  }
  return Object.freeze({
    type: 'mask' as const,
    width: geometry.width,
    height: geometry.height,
    rle: Object.freeze([...geometry.rle]),
  })
}

export function cloneAnnotation(annotation: Annotation): Annotation {
  const metadata = structuredClone(annotation.metadata)
  return Object.freeze({
    ...annotation,
    geometry: cloneGeometry(annotation.geometry),
    metadata: deepFreeze(metadata),
  }) as Annotation
}

import type {
  Annotation,
  MaskGeometry,
  PolygonGeometry,
  RectGeometry,
} from './types.js'

function deepFreeze(value: unknown, seen = new WeakSet<object>()): unknown {
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
  geometry: RectGeometry | PolygonGeometry | MaskGeometry,
): RectGeometry | PolygonGeometry | MaskGeometry {
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

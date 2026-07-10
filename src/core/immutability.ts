import type {
  Annotation,
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
  geometry: RectGeometry | PolygonGeometry,
): RectGeometry | PolygonGeometry {
  if (geometry.type === 'rect') {
    return Object.freeze({ ...geometry })
  }
  return Object.freeze({
    type: 'polygon' as const,
    points: Object.freeze(
      geometry.points.map(([x, y]) => Object.freeze([x, y] as const)),
    ),
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

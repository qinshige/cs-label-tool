const annotatorBrand: unique symbol = Symbol('Annotator')

export interface Annotator {
  readonly [annotatorBrand]: true
}

export interface AnnotatorOptions {
  readonly container: HTMLElement
  readonly historyLimit?: number
}

export interface LabelDefinition {
  readonly id: string
  readonly name: string
  readonly color: string
}

export interface ClassificationOption {
  readonly id: string
  readonly name: string
  readonly color?: string
}

export interface AnnotationBase {
  readonly id: string
  readonly labelId: string
  readonly source: 'manual' | 'ai'
  readonly status: 'suggested' | 'accepted' | 'rejected' | 'modified'
  readonly revision: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly metadata: Readonly<Record<string, unknown>>
  readonly groupId?: string
  readonly locked?: boolean
  readonly hidden?: boolean
}

export interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** 以矩形中心顺时针旋转的角度，单位为度。未设置时按 0 度处理。 */
  readonly rotation?: number
}

export interface PolygonGeometry {
  readonly type: 'polygon'
  readonly points: readonly (readonly [number, number])[]
}

export interface MaskGeometry {
  readonly type: 'mask'
  readonly width: number
  readonly height: number
  readonly rle: readonly number[]
}

export interface PointGeometry {
  readonly type: 'point'
  readonly x: number
  readonly y: number
}

export interface PolylineGeometry {
  readonly type: 'polyline'
  readonly points: readonly (readonly [number, number])[]
}

export interface EllipseGeometry {
  readonly type: 'ellipse'
  readonly cx: number
  readonly cy: number
  readonly radiusX: number
  readonly radiusY: number
  readonly rotation?: number
}

export interface RectAnnotation extends AnnotationBase {
  readonly geometry: RectGeometry
}

export interface PolygonAnnotation extends AnnotationBase {
  readonly geometry: PolygonGeometry
}

export interface MaskAnnotation extends AnnotationBase {
  readonly geometry: MaskGeometry
}

export interface PointAnnotation extends AnnotationBase {
  readonly geometry: PointGeometry
}

export interface PolylineAnnotation extends AnnotationBase {
  readonly geometry: PolylineGeometry
}

export interface EllipseAnnotation extends AnnotationBase {
  readonly geometry: EllipseGeometry
}

export type AnnotationGeometry =
  | RectGeometry
  | PolygonGeometry
  | MaskGeometry
  | PointGeometry
  | PolylineGeometry
  | EllipseGeometry

export type Annotation =
  | RectAnnotation
  | PolygonAnnotation
  | MaskAnnotation
  | PointAnnotation
  | PolylineAnnotation
  | EllipseAnnotation

export interface AnnotationSnapshot {
  readonly schemaVersion: 1
  readonly revision: number
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
  readonly classificationOptions?: readonly ClassificationOption[]
  readonly classificationId?: string | null
}

export type AnnotatorErrorCode =
  | 'ANNOTATOR_DESTROYED'
  | 'ANNOTATION_NOT_FOUND'
  | 'ANNOTATION_LOCKED'
  | 'DUPLICATE_LABEL'
  | 'INVALID_GEOMETRY'
  | 'UNKNOWN_LABEL'
  | 'UNKNOWN_CLASSIFICATION'

export class AnnotatorError extends Error {
  readonly code: AnnotatorErrorCode

  constructor(code: AnnotatorErrorCode, message: string) {
    super(message)
    this.name = 'AnnotatorError'
    this.code = code
  }
}

export function createAnnotatorHandle(): Annotator {
  return Object.freeze({ [annotatorBrand]: true as const })
}

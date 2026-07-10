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

export interface AnnotationBase {
  readonly id: string
  readonly labelId: string
  readonly source: 'manual' | 'ai'
  readonly status: 'suggested' | 'accepted' | 'rejected' | 'modified'
  readonly revision: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly metadata: Readonly<Record<string, unknown>>
}

export interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PolygonGeometry {
  readonly type: 'polygon'
  readonly points: readonly (readonly [number, number])[]
}

export interface RectAnnotation extends AnnotationBase {
  readonly geometry: RectGeometry
}

export interface PolygonAnnotation extends AnnotationBase {
  readonly geometry: PolygonGeometry
}

export type Annotation = RectAnnotation | PolygonAnnotation

export interface AnnotationSnapshot {
  readonly schemaVersion: 1
  readonly revision: number
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
}

export type AnnotatorErrorCode =
  | 'ANNOTATOR_DESTROYED'
  | 'ANNOTATION_NOT_FOUND'
  | 'DUPLICATE_LABEL'
  | 'INVALID_GEOMETRY'
  | 'UNKNOWN_LABEL'

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

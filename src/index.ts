export {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from './core/annotator.js'

export {
  AnnotatorError,
  type Annotation,
  type AnnotationBase,
  type AnnotationSnapshot,
  type Annotator,
  type AnnotatorErrorCode,
  type AnnotatorOptions,
  type LabelDefinition,
  type PolygonAnnotation,
  type PolygonGeometry,
  type RectAnnotation,
  type RectGeometry,
} from './core/types.js'

export {
  normalizeRect,
  pointInRect,
} from './geometry/rect.js'

export {
  pointInPolygon,
  validatePolygon,
  type PolygonValidation,
} from './geometry/polygon.js'

export type {
  Bounds,
  Matrix2D,
  Point,
  Size,
} from './geometry/types.js'

export {
  createViewport,
  fitViewport,
  imageToScreen,
  panViewport,
  screenToImage,
  zoomAt,
  type ViewportOptions,
  type ViewportState,
} from './viewport/viewport.js'

export {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from './core/annotator.js'

export {
  addPolygon,
  addRect,
  canRedo,
  canUndo,
  redo,
  queryAnnotations,
  removeAnnotation,
  undo,
  updateAnnotation,
  type AddPolygonInput,
  type AddRectInput,
} from './core/commands.js'

export {
  subscribe,
  type AnnotatorErrorEvent,
  type AnnotatorEventListener,
  type AnnotatorEventMap,
  type AnnotatorEventName,
  type ChangeEvent,
  type ChangeKind,
} from './core/events.js'

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

export {
  addLabel,
  getActiveLabel,
  setActiveLabel,
} from './labels/labels.js'

export {
  createGridIndex,
  insertSpatialItem,
  querySpatialBounds,
  removeSpatialItem,
  updateSpatialItem,
  type GridIndex,
} from './spatial/grid-index.js'

export {
  clientToImage,
  fitToScreen,
  imageToClient,
  panBy,
  resizeViewport,
  setImageSource,
  zoomTo,
} from './image/image-commands.js'

export { createStandardImageSource } from './image/standard-source.js'

export type {
  ImageSource,
  LoadedImage,
  StandardImageInput,
} from './image/types.js'

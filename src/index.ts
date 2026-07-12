export {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from './core/annotator.js'

export {
  addPolygon,
  addRect,
  addMask,
  canRedo,
  canUndo,
  redo,
  queryAnnotations,
  removeAnnotation,
  undo,
  updateAnnotation,
  updateAnnotationLabel,
  type AddPolygonInput,
  type AddRectInput,
  type AddMaskInput,
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
  type MaskAnnotation,
  type MaskGeometry,
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
  updateLabel,
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
  getZoom,
  hasImage,
  imageToClient,
  panBy,
  resizeViewport,
  setImageSource,
  zoomBy,
  zoomTo,
} from './image/image-commands.js'

export { createStandardImageSource } from './image/standard-source.js'

export type {
  ImageSource,
  LoadedImage,
  StandardImageInput,
} from './image/types.js'

export {
  activateTool,
  activateToolById,
  cancelActiveGesture,
  getRegisteredTools,
  getRegisteredToolsByCategory,
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  listToolsByCategory,
  createDefaultToolRegistry,
  createToolRegistry,
  createToolApi,
  deleteSelectedAnnotations,
  getActiveToolId,
  updateSelectedAnnotationsLabel,
  type AnnotationToolApi,
} from './tools/index.js'

export {
  createRectTool,
  createRectToolState,
  reduceRectTool,
  useRect,
  type RectToolInput,
  type RectToolOptions,
  type RectToolResult,
  type RectToolState,
} from './tools/rect-tool.js'

export type {
  InteractionDraft,
  NormalizedPointerInput,
  Tool,
  ToolCategory,
  ToolContext,
  ToolController,
  ToolRegistry,
  KeyboardShortcut,
} from './tools/types.js'

export {
  createPolygonTool,
  createPolygonToolState,
  reducePolygonTool,
  usePolygon,
  type PolygonToolInput,
  type PolygonToolOptions,
  type PolygonToolResult,
  type PolygonToolState,
} from './tools/polygon-tool.js'

export {
  clearSelection,
  createSelectTool,
  getSelection,
  movePolygonVertex,
  moveRect,
  removePolygonVertex,
  resizeRect,
  selectAnnotation,
  useSelect,
  type RectHandle,
} from './tools/select-tool.js'

export {
  createBrushTool,
  createBrushMaskGeometry,
  useBrush,
  type BrushToolOptions,
} from './tools/brush-tool.js'

export {
  createEraserTool,
  useEraser,
  type EraserToolOptions,
} from './tools/eraser-tool.js'

export {
  CSAnnotatorElement,
  type ComponentAnnotatorOptions,
} from './components/annotator-element.js'

export {
  defineAnnotatorElements,
  mountAnnotator,
  unmountAnnotator,
} from './components/define.js'

export {
  create,
  mount,
  csLabelTool,
  type AnnotatorInstance,
} from './cs-label-tool.js'

export {
  binaryMasksWithinDistance,
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  getBinaryMaskBounds,
  splitBinaryMaskComponents,
  translateBinaryMask,
} from './mask/rle.js'

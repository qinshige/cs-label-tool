export {
  clearImageClassification,
  getClassificationOptions,
  getImageClassification,
  setClassificationOptions,
  setImageClassification,
} from './classification/classification.js'

export type { ClassificationOption } from './core/types.js'

export {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from './core/annotator.js'

export {
  addPolygon,
  addPoint,
  addPolyline,
  addEllipse,
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
  type AddPointInput,
  type AddPolylineInput,
  type AddEllipseInput,
  type AddRectInput,
  type AddMaskInput,
} from './core/commands.js'

export {
  bringForward,
  bringToFront,
  groupAnnotations,
  removeAnnotations,
  sendBackward,
  sendToBack,
  setAnnotationsHidden,
  setAnnotationsLocked,
  translateAnnotations,
  updateAnnotationsLabel,
  ungroupAnnotations,
} from './core/arrangement-commands.js'

export {
  copyAnnotations,
  duplicateAnnotations,
  pasteAnnotations,
} from './core/clipboard.js'

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
  type AnnotationGeometry,
  type AnnotationSnapshot,
  type Annotator,
  type AnnotatorErrorCode,
  type AnnotatorOptions,
  type LabelDefinition,
  type EllipseAnnotation,
  type EllipseGeometry,
  type MaskAnnotation,
  type MaskGeometry,
  type PolygonAnnotation,
  type PolygonGeometry,
  type PointAnnotation,
  type PointGeometry,
  type PolylineAnnotation,
  type PolylineGeometry,
  type RectAnnotation,
  type RectGeometry,
} from './core/types.js'

export {
  getRectCenter,
  getRotatedRectBounds,
  getRotatedRectCorners,
  normalizeRect,
  normalizeRotation,
  pointInRect,
  pointInRotatedRect,
  rectLocalToWorld,
  rectWorldToLocal,
} from './geometry/rect.js'

export {
  pointDistance,
  pointInPoint,
} from './geometry/point.js'

export {
  getPolylineBounds,
  insertPolylineVertex,
  pointInPolyline,
  pointToSegmentDistance,
  removePolylineVertex,
} from './geometry/polyline.js'

export {
  ellipseLocalToWorld,
  ellipseWorldToLocal,
  getEllipseBounds,
  pointInEllipse,
} from './geometry/ellipse.js'

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
  createLassoTool,
  useLasso,
} from './tools/lasso-tool.js'

export {
  createFreehandTool,
  useFreehand,
  type FreehandToolOptions,
} from './tools/freehand-tool.js'

export {
  createPointTool,
  reducePointTool,
  usePoint,
  type PointToolInput,
  type PointToolOptions,
  type PointToolResult,
} from './tools/point-tool.js'

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

export {
  createEllipseTool,
  createEllipseToolState,
  reduceEllipseTool,
  useEllipse,
  type EllipseDraftGeometry,
  type EllipseToolInput,
  type EllipseToolOptions,
  type EllipseToolResult,
  type EllipseToolState,
} from './tools/ellipse-tool.js'

export {
  createPolylineTool,
  createPolylineToolState,
  reducePolylineTool,
  usePolyline,
  type PolylineToolInput,
  type PolylineToolOptions,
  type PolylineToolResult,
  type PolylineToolState,
} from './tools/polyline-tool.js'

export type {
  InteractionDraft,
  EllipseInteractionDraft,
  NormalizedPointerInput,
  PointInteractionDraft,
  PolylineInteractionDraft,
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
  getRectHandlePoints,
  getSelection,
  movePolygonVertex,
  moveRect,
  removePolygonVertex,
  resizeRect,
  rotateRect,
  selectAnnotation,
  useSelect,
  type RectHandle,
} from './tools/select-tool.js'

export {
  findPolylineSegmentInsertionIndex,
  getEllipseHandleAtPoint,
  getEllipseHandlePoints,
  movePolylineVertex,
  resizeEllipse,
  rotateEllipse,
  type EllipseHandle,
} from './selection/vector-editing.js'

export {
  selectAnnotations,
  selectAnnotationsInBounds,
  selectAnnotationsInLasso,
  toggleAnnotationSelection,
  type SelectionOptions,
} from './selection/selection-commands.js'

export {
  annotationIntersectsBounds,
  annotationIntersectsLasso,
} from './selection/hit-test.js'

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

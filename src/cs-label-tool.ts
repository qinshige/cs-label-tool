import * as Core from './core/annotator.js'
import * as Commands from './core/commands.js'
import * as Events from './core/events.js'
import * as Types from './core/types.js'
import * as Rect from './geometry/rect.js'
import * as Polygon from './geometry/polygon.js'
import * as GeometryTypes from './geometry/types.js'
import * as Viewport from './viewport/viewport.js'
import * as Labels from './labels/labels.js'
import * as Spatial from './spatial/grid-index.js'
import * as ImageCommands from './image/image-commands.js'
import * as ImageSource from './image/standard-source.js'
import * as ImageTypes from './image/types.js'
import * as Tools from './tools/index.js'
import * as RectTool from './tools/rect-tool.js'
import * as PolygonTool from './tools/polygon-tool.js'
import * as SelectTool from './tools/select-tool.js'
import * as BrushTool from './tools/brush-tool.js'
import * as EraserTool from './tools/eraser-tool.js'
import * as Components from './components/define.js'
import * as Element from './components/annotator-element.js'
import type { Tool, ToolCategory, LabelDefinition, Annotator } from './index.js'

export type {
  Annotation,
  AnnotationBase,
  AnnotationSnapshot,
  Annotator,
  AnnotatorErrorCode,
  AnnotatorOptions,
  LabelDefinition,
  PolygonAnnotation,
  PolygonGeometry,
  RectAnnotation,
  RectGeometry,
  AnnotatorError,
} from './core/types.js'

export type {
  AddPolygonInput,
  AddRectInput,
  AddMaskInput,
} from './core/commands.js'

export type {
  AnnotatorErrorEvent,
  AnnotatorEventListener,
  AnnotatorEventMap,
  AnnotatorEventName,
  ChangeEvent,
  ChangeKind,
} from './core/events.js'

export type {
  Bounds,
  Matrix2D,
  Point,
  Size,
} from './geometry/types.js'

export type {
  PolygonValidation,
} from './geometry/polygon.js'

export type {
  ViewportOptions,
  ViewportState,
} from './viewport/viewport.js'

export type {
  GridIndex,
} from './spatial/grid-index.js'

export type {
  ImageSource,
  LoadedImage,
  StandardImageInput,
} from './image/types.js'

export type {
  Tool,
  ToolCategory,
  ToolContext,
  ToolController,
  ToolRegistry,
  KeyboardShortcut,
  InteractionDraft,
  NormalizedPointerInput,
} from './tools/types.js'

export type { AnnotationToolApi } from './tools/api.js'

export type {
  RectToolInput,
  RectToolOptions,
  RectToolResult,
  RectToolState,
} from './tools/rect-tool.js'

export type {
  PolygonToolInput,
  PolygonToolOptions,
  PolygonToolResult,
  PolygonToolState,
} from './tools/polygon-tool.js'

export type {
  BrushToolOptions,
} from './tools/brush-tool.js'

export type {
  EraserToolOptions,
} from './tools/eraser-tool.js'

export type {
  RectHandle,
} from './tools/select-tool.js'

export type {
  CSAnnotatorElement,
  ComponentAnnotatorOptions,
} from './components/annotator-element.js'

const API = {
  create: Core.createAnnotator,
  destroy: Core.destroyAnnotator,
  snapshot: Core.getSnapshot,

  addRect: Commands.addRect,
  addPolygon: Commands.addPolygon,
  addMask: Commands.addMask,
  updateAnnotation: Commands.updateAnnotation,
  removeAnnotation: Commands.removeAnnotation,
  queryAnnotations: Commands.queryAnnotations,
  updateAnnotationLabel: Commands.updateAnnotationLabel,
  undo: Commands.undo,
  redo: Commands.redo,
  canUndo: Commands.canUndo,
  canRedo: Commands.canRedo,

  subscribe: Events.subscribe,

  addLabel: Labels.addLabel,
  getActiveLabel: Labels.getActiveLabel,
  setActiveLabel: Labels.setActiveLabel,
  updateLabel: Labels.updateLabel,

  setImage: ImageCommands.setImageSource,
  fitToScreen: ImageCommands.fitToScreen,
  zoomTo: ImageCommands.zoomTo,
  zoomBy: ImageCommands.zoomBy,
  panBy: ImageCommands.panBy,
  getZoom: ImageCommands.getZoom,
  hasImage: ImageCommands.hasImage,
  resizeViewport: ImageCommands.resizeViewport,
  clientToImage: ImageCommands.clientToImage,
  imageToClient: ImageCommands.imageToClient,

  createImageSource: ImageSource.createStandardImageSource,

  useSelect: SelectTool.useSelect,
  useRect: RectTool.useRect,
  usePolygon: PolygonTool.usePolygon,
  useBrush: BrushTool.useBrush,
  useEraser: EraserTool.useEraser,
  activateTool: Tools.activateTool,
  activateToolById: Tools.activateToolById,
  registerTool: Tools.registerTool,
  unregisterTool: Tools.unregisterTool,
  getTool: Tools.getTool,
  listTools: Tools.listTools,
  listToolsByCategory: Tools.listToolsByCategory,
  cancelGesture: Tools.cancelActiveGesture,
  createToolApi: Tools.createToolApi,
  getActiveToolId: Tools.getActiveToolId,
  deleteSelectedAnnotations: Tools.deleteSelectedAnnotations,
  updateSelectedAnnotationsLabel: Tools.updateSelectedAnnotationsLabel,

  selectAnnotation: SelectTool.selectAnnotation,
  clearSelection: SelectTool.clearSelection,
  getSelection: SelectTool.getSelection,

  mount: Components.mountAnnotator,
  unmount: Components.unmountAnnotator,
  defineElements: Components.defineAnnotatorElements,

  normalizeRect: Rect.normalizeRect,
  pointInRect: Rect.pointInRect,
  pointInPolygon: Polygon.pointInPolygon,
  validatePolygon: Polygon.validatePolygon,

  createGridIndex: Spatial.createGridIndex,
  insertSpatialItem: Spatial.insertSpatialItem,
  updateSpatialItem: Spatial.updateSpatialItem,
  removeSpatialItem: Spatial.removeSpatialItem,
  querySpatialBounds: Spatial.querySpatialBounds,

  createViewport: Viewport.createViewport,
  fitViewport: Viewport.fitViewport,
  imageToScreen: Viewport.imageToScreen,
  screenToImage: Viewport.screenToImage,
  zoomAt: Viewport.zoomAt,
  panViewport: Viewport.panViewport,

  createSelectTool: SelectTool.createSelectTool,
  createRectTool: RectTool.createRectTool,
  createPolygonTool: PolygonTool.createPolygonTool,
  createBrushTool: BrushTool.createBrushTool,
  createEraserTool: EraserTool.createEraserTool,

  moveRect: SelectTool.moveRect,
  resizeRect: SelectTool.resizeRect,
  movePolygonVertex: SelectTool.movePolygonVertex,
  removePolygonVertex: SelectTool.removePolygonVertex,

  AnnotatorError: Types.AnnotatorError,
}

export interface AnnotatorInstance {
  annotator: Annotator
  readonly tools: Tools.AnnotationToolApi

  addRect(input: Omit<Commands.AddRectInput, 'type'>): string
  addPolygon(input: Commands.AddPolygonInput): string
  addMask(input: Commands.AddMaskInput): string
  updateAnnotation(id: string, geometry: Types.RectGeometry | Types.PolygonGeometry | Types.MaskGeometry): void
  updateAnnotationLabel(id: string, labelId: string): void
  removeAnnotation(id: string): boolean
  queryAnnotations(bounds: GeometryTypes.Bounds): readonly Types.Annotation[]

  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean

  addLabel(label: LabelDefinition): void
  getActiveLabel(): string | null
  setActiveLabel(labelId: string): void
  updateLabel(labelId: string, updates: Partial<Pick<LabelDefinition, 'name' | 'color'>>): void

  setImage(source: ImageTypes.ImageSource): Promise<void>
  fitToScreen(): void
  zoomTo(scale: number, anchor?: GeometryTypes.Point): void
  zoomBy(factor: number): void
  panBy(delta: GeometryTypes.Point): void
  getZoom(): number
  hasImage(): boolean
  resizeViewport(): void

  useSelect(): void
  useRect(options?: Partial<RectTool.RectToolOptions>): void
  usePolygon(options?: Partial<PolygonTool.PolygonToolOptions>): void
  useBrush(options?: Partial<BrushTool.BrushToolOptions>): void
  useEraser(options?: Partial<EraserTool.EraserToolOptions>): void
  activateTool(tool: Tool): void
  activateToolById(toolId: string): void
  registerTool(tool: Tool): void
  unregisterTool(toolId: string): void
  getTool(toolId: string): Tool | undefined
  listTools(): readonly Tool[]
  listToolsByCategory(category: ToolCategory): readonly Tool[]
  cancelGesture(): void

  selectAnnotation(id: string): void
  clearSelection(): void
  getSelection(): readonly string[]

  subscribe<K extends Events.AnnotatorEventName>(
    type: K,
    listener: Events.AnnotatorEventListener<K>,
  ): () => void

  snapshot(): Types.AnnotationSnapshot
  destroy(): void
}

function createInstance(annotator: Annotator): AnnotatorInstance {
  return {
    annotator,
    tools: Tools.createToolApi(annotator),

    addRect(input) {
      return Commands.addRect(annotator, input)
    },

    addPolygon(input) {
      return Commands.addPolygon(annotator, input)
    },

    addMask(input) {
      return Commands.addMask(annotator, input)
    },

    updateAnnotation(id, geometry) {
      Commands.updateAnnotation(annotator, id, geometry)
    },

    updateAnnotationLabel(id, labelId) {
      Commands.updateAnnotationLabel(annotator, id, labelId)
    },

    removeAnnotation(id) {
      return Commands.removeAnnotation(annotator, id)
    },

    queryAnnotations(bounds) {
      return Commands.queryAnnotations(annotator, bounds)
    },

    undo() {
      return Commands.undo(annotator)
    },

    redo() {
      return Commands.redo(annotator)
    },

    canUndo() {
      return Commands.canUndo(annotator)
    },

    canRedo() {
      return Commands.canRedo(annotator)
    },

    addLabel(label) {
      Labels.addLabel(annotator, label)
    },

    getActiveLabel() {
      return Labels.getActiveLabel(annotator)
    },

    setActiveLabel(labelId) {
      Labels.setActiveLabel(annotator, labelId)
    },

    updateLabel(labelId, updates) {
      Labels.updateLabel(annotator, labelId, updates)
    },

    setImage(source) {
      return ImageCommands.setImageSource(annotator, source)
    },

    fitToScreen() {
      ImageCommands.fitToScreen(annotator)
    },

    zoomTo(scale, anchor?) {
      ImageCommands.zoomTo(annotator, scale, anchor)
    },

    zoomBy(factor) {
      ImageCommands.zoomBy(annotator, factor)
    },

    panBy(delta) {
      ImageCommands.panBy(annotator, delta)
    },

    getZoom() {
      return ImageCommands.getZoom(annotator)
    },

    hasImage() {
      return ImageCommands.hasImage(annotator)
    },

    resizeViewport() {
      ImageCommands.resizeViewport(annotator)
    },

    useSelect() {
      SelectTool.useSelect(annotator)
    },

    useRect(options) {
      RectTool.useRect(annotator, options)
    },

    usePolygon(options) {
      PolygonTool.usePolygon(annotator, options)
    },

    useBrush(options) {
      BrushTool.useBrush(annotator, options)
    },

    useEraser(options) {
      EraserTool.useEraser(annotator, options)
    },

    activateTool(tool) {
      Tools.activateTool(annotator, tool)
    },

    activateToolById(toolId) {
      Tools.activateToolById(annotator, toolId)
    },

    registerTool(tool) {
      Tools.registerTool(annotator, tool)
    },

    unregisterTool(toolId) {
      Tools.unregisterTool(annotator, toolId)
    },

    getTool(toolId) {
      return Tools.getTool(annotator, toolId)
    },

    listTools() {
      return Tools.listTools(annotator)
    },

    listToolsByCategory(category) {
      return Tools.listToolsByCategory(annotator, category)
    },

    cancelGesture() {
      Tools.cancelActiveGesture(annotator)
    },

    selectAnnotation(id) {
      SelectTool.selectAnnotation(annotator, id)
    },

    clearSelection() {
      SelectTool.clearSelection(annotator)
    },

    getSelection() {
      return SelectTool.getSelection(annotator)
    },

    subscribe(type, listener) {
      return Events.subscribe(annotator, type, listener)
    },

    snapshot() {
      return Core.getSnapshot(annotator)
    },

    destroy() {
      Core.destroyAnnotator(annotator)
    },
  }
}

export function create(config: Types.AnnotatorOptions): AnnotatorInstance {
  const annotator = Core.createAnnotator(config)
  return createInstance(annotator)
}

export function mount(
  container: string | HTMLElement,
  options?: Partial<Types.AnnotatorOptions>,
): AnnotatorInstance {
  const annotator = Components.mountAnnotator(container, options)
  return createInstance(annotator)
}

export { API as default }

export const csLabelTool = API

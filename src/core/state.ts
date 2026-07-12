import type {
  Annotation,
  AnnotatorOptions,
  LabelDefinition,
} from './types.js'
import type { EventListeners } from './events.js'
import { createGridIndex, type GridIndex } from '../spatial/grid-index.js'
import type { ImageSource, LoadedImage } from '../image/types.js'
import type { CanvasRenderer } from '../render/canvas-renderer.js'
import type { ViewportState } from '../viewport/viewport.js'
import type { ToolController, InteractionDraft, ToolRegistry } from '../tools/types.js'
import { createDefaultToolRegistry } from '../tools/registry.js'

export interface HistoryEntry {
  readonly undo: (state: InternalState) => void
  readonly redo: (state: InternalState) => void
}

export interface InternalState {
  readonly container: HTMLElement
  readonly historyLimit: number
  destroyed: boolean
  revision: number
  annotations: Annotation[]
  labels: LabelDefinition[]
  activeLabelId: string | null
  spatialIndex: GridIndex
  annotationsById: Map<string, Annotation>
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  readonly listeners: EventListeners
  imageSource: ImageSource | null
  image: LoadedImage | null
  imageAbortController: AbortController | null
  renderer: CanvasRenderer | null
  viewport: ViewportState | null
  toolController: ToolController | null
  activeToolId: string | null
  interactionDraft: InteractionDraft | null
  selectedIds: string[]
  readonly toolRegistry: ToolRegistry
}

export function createInternalState(options: AnnotatorOptions): InternalState {
  return {
    container: options.container,
    historyLimit: options.historyLimit ?? 100,
    destroyed: false,
    revision: 0,
    annotations: [],
    labels: [],
    activeLabelId: null,
    spatialIndex: createGridIndex(512),
    annotationsById: new Map(),
    undoStack: [],
    redoStack: [],
    listeners: {
      change: new Set(),
      error: new Set(),
    },
    imageSource: null,
    image: null,
    imageAbortController: null,
    renderer: null,
    viewport: null,
    toolController: null,
    activeToolId: null,
    interactionDraft: null,
    selectedIds: [],
    toolRegistry: createDefaultToolRegistry(),
  }
}

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

export interface DomainContents {
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
  readonly activeLabelId: string | null
  readonly spatialIndex: GridIndex
}

export interface HistoryEntry {
  readonly before: DomainContents
  readonly after: DomainContents
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
  }
}

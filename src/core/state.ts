import type {
  Annotation,
  AnnotatorOptions,
  LabelDefinition,
} from './types.js'
import type { EventListeners } from './events.js'

export interface DomainContents {
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
  readonly activeLabelId: string | null
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
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  readonly listeners: EventListeners
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
    undoStack: [],
    redoStack: [],
    listeners: {
      change: new Set(),
      error: new Set(),
    },
  }
}

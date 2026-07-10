import type {
  Annotation,
  AnnotatorOptions,
  LabelDefinition,
} from './types.js'

export interface InternalState {
  readonly container: HTMLElement
  readonly historyLimit: number
  destroyed: boolean
  revision: number
  annotations: Annotation[]
  labels: LabelDefinition[]
}

export function createInternalState(options: AnnotatorOptions): InternalState {
  return {
    container: options.container,
    historyLimit: options.historyLimit ?? 100,
    destroyed: false,
    revision: 0,
    annotations: [],
    labels: [],
  }
}

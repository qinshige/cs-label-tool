import type {
  Annotator,
  PolygonGeometry,
  RectGeometry,
} from '../core/types.js'
import type { Bounds, Point } from '../geometry/types.js'

export type NormalizedPointerInput =
  | { readonly type: 'cancel' }
  | {
      readonly type: 'down' | 'move' | 'up'
      readonly pointerId: number
      readonly imagePoint: Point
      readonly buttons: number
      readonly pressure: number
      readonly detail: number
    }

export interface RectInteractionDraft {
  readonly type: 'rect'
  readonly geometry: Bounds
  readonly labelId: string
}

export interface PolygonInteractionDraft {
  readonly type: 'polygon'
  readonly points: readonly Point[]
  readonly labelId: string
}

export interface VectorInteractionDraft {
  readonly type: 'vector'
  readonly annotationId: string
  readonly geometry: RectGeometry | PolygonGeometry
  readonly labelId: string
}

export type InteractionDraft =
  | PolygonInteractionDraft
  | RectInteractionDraft
  | VectorInteractionDraft

export interface ToolContext {
  readonly annotator: Annotator
  readonly setDraft: (draft: InteractionDraft) => void
  readonly clearDraft: () => void
}

export interface Tool {
  readonly id: string
  readonly cursor: string
  readonly handle: (
    input: NormalizedPointerInput,
    context: ToolContext,
  ) => void
  readonly cancel: (context: ToolContext) => void
  readonly handleKey?: (event: KeyboardEvent, context: ToolContext) => void
}

export interface ToolController {
  readonly activate: (tool: Tool) => void
  readonly cancel: () => void
  readonly destroy: () => void
}

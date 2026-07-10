import type { Annotator } from '../core/types.js'
import type { Bounds, Point } from '../geometry/types.js'

export type NormalizedPointerInput =
  | { readonly type: 'cancel' }
  | {
      readonly type: 'down' | 'move' | 'up'
      readonly pointerId: number
      readonly imagePoint: Point
      readonly buttons: number
      readonly pressure: number
    }

export interface RectInteractionDraft {
  readonly type: 'rect'
  readonly geometry: Bounds
  readonly labelId: string
}

export type InteractionDraft = RectInteractionDraft

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
}

export interface ToolController {
  readonly activate: (tool: Tool) => void
  readonly cancel: () => void
  readonly destroy: () => void
}

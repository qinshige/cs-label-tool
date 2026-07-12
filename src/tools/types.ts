import type {
  Annotator,
  MaskGeometry,
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

export interface BrushInteractionDraft {
  readonly type: 'brush'
  readonly points: readonly Point[]
  readonly size: number
  readonly labelId: string
}

export interface EraserInteractionDraft {
  readonly type: 'eraser'
  readonly points: readonly Point[]
  readonly size: number
}

export interface VectorInteractionDraft {
  readonly type: 'vector'
  readonly annotationId: string
  readonly geometry: RectGeometry | PolygonGeometry | MaskGeometry
  readonly labelId: string
}

export type InteractionDraft =
  | BrushInteractionDraft
  | EraserInteractionDraft
  | PolygonInteractionDraft
  | RectInteractionDraft
  | VectorInteractionDraft

export interface ToolContext {
  readonly annotator: Annotator
  readonly setDraft: (draft: InteractionDraft) => void
  readonly clearDraft: () => void
}

export interface KeyboardShortcut {
  readonly key: string
  readonly ctrl?: boolean
  readonly shift?: boolean
  readonly meta?: boolean
  readonly alt?: boolean
}

export type ToolCategory = 'selection' | 'drawing' | 'navigation' | 'utility'

export interface Tool {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly icon?: string
  readonly cursor: string
  readonly category: ToolCategory
  readonly shortcuts?: readonly KeyboardShortcut[]
  readonly handle: (
    input: NormalizedPointerInput,
    context: ToolContext,
  ) => void
  readonly cancel: (context: ToolContext) => void
  readonly handleKey?: (event: KeyboardEvent, context: ToolContext) => void
}

export interface ToolController {
  readonly activate: (tool: Tool) => void
  readonly activateById: (toolId: string) => void
  readonly cancel: () => void
  readonly destroy: () => void
}

export interface ToolRegistry {
  readonly register: (tool: Tool) => void
  readonly unregister: (toolId: string) => void
  readonly get: (toolId: string) => Tool | undefined
  readonly list: () => readonly Tool[]
  readonly listByCategory: (category: ToolCategory) => readonly Tool[]
}

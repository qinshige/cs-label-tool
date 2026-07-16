import type {
  AnnotationGeometry,
  Annotator,
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
      readonly shiftKey?: boolean
      readonly altKey?: boolean
      readonly ctrlKey?: boolean
      readonly metaKey?: boolean
    }

export interface PointInteractionDraft {
  readonly type: 'point'
  readonly point: Point
  readonly labelId: string
}

export interface PolylineInteractionDraft {
  readonly type: 'polyline'
  readonly points: readonly Point[]
  readonly labelId: string
}

export interface EllipseInteractionDraft {
  readonly type: 'ellipse'
  readonly geometry: {
    readonly cx: number
    readonly cy: number
    readonly radiusX: number
    readonly radiusY: number
  }
  readonly labelId: string
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
  readonly color: string
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
  readonly geometry: AnnotationGeometry
  readonly labelId: string
}

export interface SelectionInteractionDraft {
  readonly type: 'selection'
  readonly mode: 'marquee' | 'lasso'
  readonly points: readonly Point[]
}

export type InteractionDraft =
  | BrushInteractionDraft
  | EllipseInteractionDraft
  | EraserInteractionDraft
  | PointInteractionDraft
  | PolygonInteractionDraft
  | PolylineInteractionDraft
  | RectInteractionDraft
  | SelectionInteractionDraft
  | VectorInteractionDraft

export interface ToolContext {
  // Draft 只用于实时预览，不进入历史记录；工具在手势完成后自行提交正式数据。
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
  // 所有工具都接收统一后的图片坐标，因此不需要各自处理 DPR、缩放和平移。
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

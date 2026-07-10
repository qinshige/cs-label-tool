import { validatePolygon } from '../geometry/polygon.js'
import type { Point } from '../geometry/types.js'
import { addPolygon } from '../core/commands.js'
import { AnnotatorError, type Annotator } from '../core/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { activateTool } from './controller.js'
import type {
  NormalizedPointerInput,
  Tool,
  ToolContext,
} from './types.js'

export interface PolygonToolState {
  readonly points: readonly Point[]
  readonly preview: Point | null
}

export type PolygonToolInput =
  | { readonly type: 'cancel' }
  | { readonly type: 'commit' }
  | { readonly type: 'remove-last' }
  | { readonly type: 'move'; readonly imagePoint: Point }
  | { readonly type: 'point'; readonly imagePoint: Point }

export interface PolygonToolResult {
  readonly state: PolygonToolState
  readonly draft?: readonly Point[]
  readonly commit?: readonly Point[]
}

export function createPolygonToolState(): PolygonToolState {
  return { points: [], preview: null }
}

export function reducePolygonTool(
  state: PolygonToolState,
  input: PolygonToolInput,
): PolygonToolResult {
  if (input.type === 'cancel') {
    return { state: createPolygonToolState() }
  }
  if (input.type === 'move') {
    const next = { ...state, preview: input.imagePoint }
    return {
      state: next,
      draft: [...next.points, input.imagePoint],
    }
  }
  if (input.type === 'remove-last') {
    const next = { ...state, points: state.points.slice(0, -1) }
    return { state: next, draft: next.points }
  }
  if (input.type === 'commit') {
    if (!validatePolygon(state.points).valid) {
      return { state }
    }
    return {
      state: createPolygonToolState(),
      commit: [...state.points],
    }
  }

  const previous = state.points.at(-1)
  if (
    previous !== undefined &&
    previous.x === input.imagePoint.x &&
    previous.y === input.imagePoint.y
  ) {
    return { state }
  }
  const next = {
    points: [...state.points, input.imagePoint],
    preview: input.imagePoint,
  }
  return { state: next, draft: next.points }
}

export interface PolygonToolOptions {
  readonly labelId: string
}

export function createPolygonTool(options: PolygonToolOptions): Tool {
  let state = createPolygonToolState()

  const applyResult = (
    result: PolygonToolResult,
    context: ToolContext,
  ) => {
    state = result.state
    if (result.draft !== undefined) {
      context.setDraft({
        type: 'polygon',
        points: result.draft,
        labelId: options.labelId,
      })
    } else if (state.points.length === 0) {
      context.clearDraft()
    }
    if (result.commit !== undefined) {
      addPolygon(context.annotator, {
        labelId: options.labelId,
        points: result.commit,
      })
      context.clearDraft()
    }
  }

  const commit = (context: ToolContext) => {
    applyResult(reducePolygonTool(state, { type: 'commit' }), context)
  }

  return {
    id: 'polygon',
    cursor: 'crosshair',
    handle(input: NormalizedPointerInput, context: ToolContext) {
      if (input.type === 'cancel') {
        applyResult(reducePolygonTool(state, { type: 'cancel' }), context)
        return
      }
      if (input.type === 'move' && state.points.length > 0) {
        applyResult(reducePolygonTool(state, {
          type: 'move',
          imagePoint: input.imagePoint,
        }), context)
        return
      }
      if (input.type === 'down') {
        applyResult(reducePolygonTool(state, {
          type: 'point',
          imagePoint: input.imagePoint,
        }), context)
        if (input.detail >= 2) {
          commit(context)
        }
      }
    },
    handleKey(event, context) {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit(context)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        applyResult(
          reducePolygonTool(state, { type: 'remove-last' }),
          context,
        )
      }
    },
    cancel(context) {
      applyResult(reducePolygonTool(state, { type: 'cancel' }), context)
    },
  }
}

export function usePolygon(
  annotator: Annotator,
  options: Partial<PolygonToolOptions> = {},
): void {
  const labelId = options.labelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing a polygon.',
    )
  }
  activateTool(annotator, createPolygonTool({ labelId }))
}

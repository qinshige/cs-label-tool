import { addPolyline } from '../core/commands.js'
import { AnnotatorError, type Annotator } from '../core/types.js'
import type { Point } from '../geometry/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { activateTool } from './controller.js'
import type { NormalizedPointerInput, Tool, ToolContext } from './types.js'

export interface PolylineToolState {
  readonly points: readonly Point[]
  readonly preview: Point | null
}

export type PolylineToolInput =
  | { readonly type: 'cancel' }
  | { readonly type: 'commit' }
  | { readonly type: 'remove-last' }
  | { readonly type: 'move'; readonly imagePoint: Point }
  | { readonly type: 'point'; readonly imagePoint: Point }

export interface PolylineToolResult {
  readonly state: PolylineToolState
  readonly draft?: readonly Point[]
  readonly commit?: readonly Point[]
}

export function createPolylineToolState(): PolylineToolState {
  return { points: [], preview: null }
}

export function reducePolylineTool(
  state: PolylineToolState,
  input: PolylineToolInput,
): PolylineToolResult {
  if (input.type === 'cancel') {
    return { state: createPolylineToolState() }
  }
  if (input.type === 'move') {
    const next = { ...state, preview: input.imagePoint }
    return { state: next, draft: [...next.points, input.imagePoint] }
  }
  if (input.type === 'remove-last') {
    const next = { ...state, points: state.points.slice(0, -1) }
    return { state: next, draft: next.points }
  }
  if (input.type === 'commit') {
    if (state.points.length < 2) {
      return { state }
    }
    return {
      state: createPolylineToolState(),
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

export interface PolylineToolOptions {
  readonly labelId?: string
}

function resolveLabelId(
  annotator: Annotator,
  configuredLabelId: string | undefined,
): string {
  const labelId = configuredLabelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing a polyline.',
    )
  }
  return labelId
}

export function createPolylineTool(options: PolylineToolOptions = {}): Tool {
  let state = createPolylineToolState()

  const applyResult = (result: PolylineToolResult, context: ToolContext) => {
    state = result.state
    if (result.draft !== undefined) {
      context.setDraft({
        type: 'polyline',
        points: result.draft,
        labelId: resolveLabelId(context.annotator, options.labelId),
      })
    } else if (state.points.length === 0) {
      context.clearDraft()
    }
    if (result.commit !== undefined) {
      addPolyline(context.annotator, {
        labelId: resolveLabelId(context.annotator, options.labelId),
        points: result.commit,
      })
      context.clearDraft()
    }
  }

  const commit = (context: ToolContext) => {
    applyResult(reducePolylineTool(state, { type: 'commit' }), context)
  }

  return {
    id: 'polyline',
    name: '折线',
    description: '绘制道路、边界和路径',
    icon: '⌁',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'l' }],
    handle(input, context) {
      if (input.type === 'cancel') {
        applyResult(reducePolylineTool(state, { type: 'cancel' }), context)
      } else if (input.type === 'move' && state.points.length > 0) {
        applyResult(reducePolylineTool(state, {
          type: 'move',
          imagePoint: input.imagePoint,
        }), context)
      } else if (input.type === 'down') {
        applyResult(reducePolylineTool(state, {
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
          reducePolylineTool(state, { type: 'remove-last' }),
          context,
        )
      }
    },
    cancel(context) {
      applyResult(reducePolylineTool(state, { type: 'cancel' }), context)
    },
  }
}

export function usePolyline(
  annotator: Annotator,
  options: Partial<PolylineToolOptions> = {},
): void {
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createPolylineTool(options))
}

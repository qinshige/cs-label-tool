import { normalizeRect } from '../geometry/rect.js'
import type { Bounds, Point } from '../geometry/types.js'
import { addRect } from '../core/commands.js'
import { getActiveLabel } from '../labels/labels.js'
import { AnnotatorError } from '../core/types.js'
import type { Annotator } from '../core/types.js'
import { activateTool } from './controller.js'
import type {
  NormalizedPointerInput,
  Tool,
  ToolContext,
} from './types.js'

export type RectToolState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'drawing'
      readonly pointerId: number
      readonly start: Point
      readonly current: Point
    }

export type RectToolInput =
  | { readonly type: 'cancel' }
  | {
      readonly type: 'down' | 'move' | 'up'
      readonly pointerId: number
      readonly imagePoint: Point
    }

export interface RectToolResult {
  readonly state: RectToolState
  readonly draft?: Bounds
  readonly commit?: Bounds
}

export function createRectToolState(): RectToolState {
  return { phase: 'idle' }
}

export function reduceRectTool(
  state: RectToolState,
  input: RectToolInput,
  minimumSize = 0,
): RectToolResult {
  if (input.type === 'cancel') {
    return { state: createRectToolState() }
  }

  if (input.type === 'down') {
    if (state.phase !== 'idle') {
      return { state }
    }
    return {
      state: {
        phase: 'drawing',
        pointerId: input.pointerId,
        start: input.imagePoint,
        current: input.imagePoint,
      },
      draft: normalizeRect(input.imagePoint, input.imagePoint),
    }
  }

  if (state.phase !== 'drawing' || input.pointerId !== state.pointerId) {
    return { state }
  }

  const draft = normalizeRect(state.start, input.imagePoint)
  if (input.type === 'move') {
    return {
      state: { ...state, current: input.imagePoint },
      draft,
    }
  }

  if (draft.width < minimumSize || draft.height < minimumSize) {
    return { state: createRectToolState() }
  }
  return { state: createRectToolState(), commit: draft }
}

export interface RectToolOptions {
  readonly labelId: string
  readonly minimumSize?: number
}

export function createRectTool(options: RectToolOptions): Tool {
  let state = createRectToolState()

  const applyResult = (
    input: NormalizedPointerInput,
    context: ToolContext,
  ) => {
    const result = reduceRectTool(
      state,
      input,
      options.minimumSize ?? 1,
    )
    state = result.state
    if (result.draft !== undefined) {
      context.setDraft({
        type: 'rect',
        geometry: result.draft,
        labelId: options.labelId,
      })
    } else {
      context.clearDraft()
    }
    if (result.commit !== undefined) {
      addRect(context.annotator, {
        labelId: options.labelId,
        ...result.commit,
      })
    }
  }

  return {
    id: 'rect',
    cursor: 'crosshair',
    handle: applyResult,
    cancel(context) {
      state = reduceRectTool(state, { type: 'cancel' }).state
      context.clearDraft()
    },
  }
}

export function useRect(
  annotator: Annotator,
  options: Partial<RectToolOptions> = {},
): void {
  const labelId = options.labelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing a rectangle.',
    )
  }
  activateTool(annotator, createRectTool({
    labelId,
    ...(options.minimumSize === undefined
      ? {}
      : { minimumSize: options.minimumSize }),
  }))
}

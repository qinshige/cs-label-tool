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
  // reducer 只计算状态和结果，不直接读写标注器，便于单元测试。
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
    // 过滤误点击和过小矩形，不生成历史记录。
    return { state: createRectToolState() }
  }
  return { state: createRectToolState(), commit: draft }
}

export interface RectToolOptions {
  readonly labelId?: string
  readonly minimumSize?: number
}

function resolveLabelId(
  annotator: Annotator,
  configuredLabelId: string | undefined,
): string {
  const labelId = configuredLabelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing a rectangle.',
    )
  }
  return labelId
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
      const labelId = resolveLabelId(context.annotator, options.labelId)
      context.setDraft({
        type: 'rect',
        geometry: result.draft,
        labelId,
      })
    } else {
      context.clearDraft()
    }
    if (result.commit !== undefined) {
      // 只有 pointerup 产生 commit 时才写入持久标注。
      const labelId = resolveLabelId(context.annotator, options.labelId)
      addRect(context.annotator, {
        labelId,
        ...result.commit,
      })
    }
  }

  return {
    id: 'rect',
    name: '矩形',
    description: '绘制矩形标注',
    icon: '⬜',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'r' }],
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
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createRectTool(options))
}

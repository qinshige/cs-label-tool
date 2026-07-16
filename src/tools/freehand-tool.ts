import { addPolygon } from '../core/commands.js'
import { AnnotatorError, type Annotator } from '../core/types.js'
import { simplifyPath } from '../geometry/path-simplification.js'
import { validatePolygon } from '../geometry/polygon.js'
import type { Point } from '../geometry/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { activateTool } from './controller.js'
import type { Tool, ToolContext } from './types.js'

const DEFAULT_SIMPLIFY_TOLERANCE = 1.5

type FreehandState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'drawing'
      readonly pointerId: number
      readonly labelId: string
      readonly points: readonly Point[]
    }

export interface FreehandToolOptions {
  readonly labelId?: string
  readonly simplifyTolerance?: number
}

function resolveLabelId(
  annotator: Annotator,
  configuredLabelId: string | undefined,
): string {
  const labelId = configuredLabelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing a freehand contour.',
    )
  }
  return labelId
}

function resolveTolerance(value: number | undefined): number {
  const tolerance = value ?? DEFAULT_SIMPLIFY_TOLERANCE
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError(
      'simplifyTolerance must be a finite non-negative number.',
    )
  }
  return tolerance
}

export function createFreehandTool(
  options: FreehandToolOptions = {},
): Tool {
  const simplifyTolerance = resolveTolerance(options.simplifyTolerance)
  let state: FreehandState = { phase: 'idle' }

  const cancel = (context: ToolContext) => {
    const wasDrawing = state.phase === 'drawing'
    state = { phase: 'idle' }
    if (wasDrawing) {
      context.clearDraft()
    }
  }

  return {
    id: 'freehand',
    name: '自由轮廓',
    description: '按住拖动绘制自由轮廓标注',
    icon: '⌁',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'f' }],
    handle(input, context) {
      if (input.type === 'cancel') {
        cancel(context)
        return
      }
      if (input.type === 'down') {
        const labelId = resolveLabelId(context.annotator, options.labelId)
        state = {
          phase: 'drawing',
          pointerId: input.pointerId,
          labelId,
          points: [input.imagePoint],
        }
        context.setDraft({
          type: 'polygon',
          points: state.points,
          labelId,
        })
        return
      }
      if (state.phase !== 'drawing' || state.pointerId !== input.pointerId) {
        return
      }

      const points = [...state.points, input.imagePoint]
      if (input.type === 'move') {
        state = { ...state, points }
        context.setDraft({
          type: 'polygon',
          points,
          labelId: state.labelId,
        })
        return
      }

      // 抬起时一次性提交，确保一次自由绘制只产生一条撤销记录。
      const labelId = state.labelId
      const simplified = simplifyPath(points, simplifyTolerance)
      state = { phase: 'idle' }
      if (validatePolygon(simplified).valid) {
        addPolygon(context.annotator, { labelId, points: simplified })
      }
      context.clearDraft()
    },
    cancel,
  }
}

export function useFreehand(
  annotator: Annotator,
  options: FreehandToolOptions = {},
): void {
  // 激活时先给出无标签错误；未显式传 labelId 时，真正按下鼠标再读取最新标签。
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createFreehandTool(options))
}

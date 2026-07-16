import { addPoint } from '../core/commands.js'
import { AnnotatorError, type Annotator } from '../core/types.js'
import type { Point } from '../geometry/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { activateTool } from './controller.js'
import type { NormalizedPointerInput, Tool } from './types.js'

export type PointToolInput =
  | { readonly type: 'cancel' }
  | {
      readonly type: 'down' | 'move' | 'up'
      readonly pointerId: number
      readonly imagePoint: Point
    }

export interface PointToolResult {
  readonly commit?: Point
}

export function reducePointTool(input: PointToolInput): PointToolResult {
  // 点标注在按下时立即提交，避免轻微拖动造成重复点。
  return input.type === 'down' ? { commit: input.imagePoint } : {}
}

export interface PointToolOptions {
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
      'A label must be active before drawing a point.',
    )
  }
  return labelId
}

export function createPointTool(options: PointToolOptions = {}): Tool {
  return {
    id: 'point',
    name: '点',
    description: '绘制独立点标注',
    icon: '•',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'k' }],
    handle(input: NormalizedPointerInput, context) {
      const result = reducePointTool(input)
      if (result.commit === undefined) {
        return
      }
      addPoint(context.annotator, {
        labelId: resolveLabelId(context.annotator, options.labelId),
        ...result.commit,
      })
    },
    cancel(context) {
      context.clearDraft()
    },
  }
}

export function usePoint(
  annotator: Annotator,
  options: Partial<PointToolOptions> = {},
): void {
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createPointTool(options))
}

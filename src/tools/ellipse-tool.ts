import { addEllipse } from '../core/commands.js'
import { AnnotatorError, type Annotator } from '../core/types.js'
import type { Point } from '../geometry/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { activateTool } from './controller.js'
import type { NormalizedPointerInput, Tool, ToolContext } from './types.js'

export interface EllipseDraftGeometry {
  readonly cx: number
  readonly cy: number
  readonly radiusX: number
  readonly radiusY: number
}

export type EllipseToolState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'drawing'
      readonly pointerId: number
      readonly start: Point
      readonly current: Point
    }

export type EllipseToolInput =
  | { readonly type: 'cancel' }
  | {
      readonly type: 'down' | 'move' | 'up'
      readonly pointerId: number
      readonly imagePoint: Point
      readonly shiftKey?: boolean
    }

export interface EllipseToolResult {
  readonly state: EllipseToolState
  readonly draft?: EllipseDraftGeometry
  readonly commit?: EllipseDraftGeometry
}

export function createEllipseToolState(): EllipseToolState {
  return { phase: 'idle' }
}

function ellipseFromDrag(
  start: Point,
  current: Point,
  circle: boolean,
): EllipseDraftGeometry {
  let endX = current.x
  let endY = current.y
  if (circle) {
    const size = Math.max(
      Math.abs(current.x - start.x),
      Math.abs(current.y - start.y),
    )
    endX = start.x + Math.sign(current.x - start.x || 1) * size
    endY = start.y + Math.sign(current.y - start.y || 1) * size
  }
  return {
    cx: (start.x + endX) / 2,
    cy: (start.y + endY) / 2,
    radiusX: Math.abs(endX - start.x) / 2,
    radiusY: Math.abs(endY - start.y) / 2,
  }
}

export function reduceEllipseTool(
  state: EllipseToolState,
  input: EllipseToolInput,
  minimumRadius = 0,
): EllipseToolResult {
  if (input.type === 'cancel') {
    return { state: createEllipseToolState() }
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
      draft: ellipseFromDrag(
        input.imagePoint,
        input.imagePoint,
        input.shiftKey === true,
      ),
    }
  }
  if (state.phase !== 'drawing' || state.pointerId !== input.pointerId) {
    return { state }
  }

  const draft = ellipseFromDrag(
    state.start,
    input.imagePoint,
    input.shiftKey === true,
  )
  if (input.type === 'move') {
    return {
      state: { ...state, current: input.imagePoint },
      draft,
    }
  }
  if (draft.radiusX < minimumRadius || draft.radiusY < minimumRadius) {
    return { state: createEllipseToolState() }
  }
  return { state: createEllipseToolState(), commit: draft }
}

export interface EllipseToolOptions {
  readonly labelId?: string
  readonly minimumRadius?: number
}

function resolveLabelId(
  annotator: Annotator,
  configuredLabelId: string | undefined,
): string {
  const labelId = configuredLabelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before drawing an ellipse.',
    )
  }
  return labelId
}

export function createEllipseTool(options: EllipseToolOptions = {}): Tool {
  let state = createEllipseToolState()

  const applyResult = (
    input: NormalizedPointerInput,
    context: ToolContext,
  ) => {
    const result = reduceEllipseTool(
      state,
      input,
      options.minimumRadius ?? 1,
    )
    state = result.state
    if (result.draft !== undefined) {
      context.setDraft({
        type: 'ellipse',
        geometry: result.draft,
        labelId: resolveLabelId(context.annotator, options.labelId),
      })
    } else {
      context.clearDraft()
    }
    if (result.commit !== undefined) {
      addEllipse(context.annotator, {
        labelId: resolveLabelId(context.annotator, options.labelId),
        ...result.commit,
      })
    }
  }

  return {
    id: 'ellipse',
    name: '椭圆',
    description: '拖拽绘制椭圆，按住 Shift 绘制圆形',
    icon: '◯',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'o' }],
    handle: applyResult,
    cancel(context) {
      state = reduceEllipseTool(state, { type: 'cancel' }).state
      context.clearDraft()
    },
  }
}

export function useEllipse(
  annotator: Annotator,
  options: Partial<EllipseToolOptions> = {},
): void {
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createEllipseTool(options))
}

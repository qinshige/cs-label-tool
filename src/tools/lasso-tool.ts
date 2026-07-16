import type { Point } from '../geometry/types.js'
import { getSelection } from './select-tool.js'
import {
  selectAnnotations,
  selectAnnotationsInLasso,
  setSelectionOutline,
} from '../selection/selection-commands.js'
import { activateTool } from './controller.js'
import type { Tool, ToolContext } from './types.js'

type LassoState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'drawing'
      readonly pointerId: number
      readonly points: readonly Point[]
      readonly append: boolean
      readonly previousIds: readonly string[]
    }

export function createLassoTool(): Tool {
  let state: LassoState = { phase: 'idle' }

  const cancel = (context: ToolContext) => {
    const wasDrawing = state.phase === 'drawing'
    state = { phase: 'idle' }
    if (wasDrawing) {
      context.clearDraft()
    }
  }

  return {
    id: 'lasso',
    name: '套索',
    description: '自由圈选相交的标注',
    icon: '⌇',
    cursor: 'crosshair',
    category: 'selection',
    shortcuts: [{ key: 'a' }],
    handle(input, context) {
      if (input.type === 'cancel') {
        cancel(context)
        return
      }
      if (input.type === 'down') {
        // 新套索开始时替换上一次完成边界，其他工具不会触发这里。
        setSelectionOutline(context.annotator, null)
        state = {
          phase: 'drawing',
          pointerId: input.pointerId,
          points: [input.imagePoint],
          append: input.shiftKey === true,
          previousIds: getSelection(context.annotator),
        }
        context.setDraft({
          type: 'selection',
          mode: 'lasso',
          points: state.points,
        })
        return
      }
      if (state.phase !== 'drawing' || state.pointerId !== input.pointerId) {
        return
      }
      const points = [...state.points, input.imagePoint]
      const drawing = { ...state, points }
      state = drawing
      if (input.type === 'move') {
        context.setDraft({ type: 'selection', mode: 'lasso', points })
        return
      }
      const selected = selectAnnotationsInLasso(context.annotator, points)
      if (drawing.append) {
        selectAnnotations(context.annotator, [
          ...drawing.previousIds,
          ...selected,
        ])
      }
      // 完成边界不再占用 interactionDraft，否则切换工具或开始绘制时会被清掉。
      state = { phase: 'idle' }
      setSelectionOutline(context.annotator, {
        type: 'selection',
        mode: 'lasso',
        points,
      })
      context.clearDraft()
    },
    cancel,
  }
}

export function useLasso(annotator: Parameters<typeof activateTool>[0]): void {
  activateTool(annotator, createLassoTool())
}

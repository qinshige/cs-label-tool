import { getInternalState } from '../core/annotator.js'
import type { Annotator } from '../core/types.js'
import { clientToImage } from '../image/image-commands.js'
import type {
  InteractionDraft,
  NormalizedPointerInput,
  Tool,
  ToolCategory,
  ToolContext,
  ToolController,
  ToolRegistry,
} from './types.js'

function createToolContext(annotator: Annotator): ToolContext {
  return {
    annotator,
    setDraft(draft: InteractionDraft) {
      const state = getInternalState(annotator)
      state.interactionDraft = draft
      if (draft.type === 'eraser') {
        state.renderer?.invalidate('annotations')
      }
      state.renderer?.invalidate('interaction')
    },
    clearDraft() {
      const state = getInternalState(annotator)
      const redrawAnnotations = state.interactionDraft?.type === 'eraser'
      state.interactionDraft = null
      if (redrawAnnotations) {
        state.renderer?.invalidate('annotations')
      }
      state.renderer?.invalidate('interaction')
    },
  }
}

function normalizePointer(
  annotator: Annotator,
  event: PointerEvent,
  type: 'down' | 'move' | 'up',
): NormalizedPointerInput {
  const state = getInternalState(annotator)
  const point = clientToImage(annotator, {
    x: event.clientX,
    y: event.clientY,
  })
  const imagePoint = state.image === null
    ? point
    : {
        x: Math.min(state.image.width, Math.max(0, point.x)),
        y: Math.min(state.image.height, Math.max(0, point.y)),
      }
  return {
    type,
    pointerId: event.pointerId,
    imagePoint,
    buttons: event.buttons,
    pressure: event.pressure,
    detail: event.detail,
  }
}

export function createToolController(
  annotator: Annotator,
  canvas: HTMLCanvasElement,
  registry: ToolRegistry,
): ToolController {
  const context = createToolContext(annotator)
  let activeTool: Tool | null = null
  let destroyed = false

  canvas.tabIndex = 0

  const down = (event: PointerEvent) => {
    if (activeTool === null || event.button !== 0) {
      return
    }
    canvas.focus({ preventScroll: true })
    canvas.setPointerCapture(event.pointerId)
    activeTool.handle(normalizePointer(annotator, event, 'down'), context)
  }
  const move = (event: PointerEvent) => {
    activeTool?.handle(normalizePointer(annotator, event, 'move'), context)
  }
  const up = (event: PointerEvent) => {
    activeTool?.handle(normalizePointer(annotator, event, 'up'), context)
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }
  const cancelPointer = () => {
    activeTool?.handle({ type: 'cancel' }, context)
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      activeTool?.cancel(context)
      return
    }
    activeTool?.handleKey?.(event, context)
  }

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancelPointer)
  canvas.addEventListener('keydown', keydown)

  return {
    activate(tool) {
      if (destroyed) {
        return
      }
      activeTool?.cancel(context)
      activeTool = tool
      canvas.style.cursor = tool.cursor
      getInternalState(annotator).activeToolId = tool.id
    },
    activateById(toolId) {
      const tool = registry.get(toolId)
      if (tool !== undefined) {
        this.activate(tool)
      }
    },
    cancel() {
      activeTool?.cancel(context)
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      activeTool?.cancel(context)
      activeTool = null
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancelPointer)
      canvas.removeEventListener('keydown', keydown)
    },
  }
}

function requireController(annotator: Annotator): ToolController {
  const state = getInternalState(annotator)
  if (state.renderer === null) {
    throw new Error('An image must be loaded before activating a drawing tool.')
  }
  state.toolController ??= createToolController(
    annotator,
    state.renderer.eventCanvas,
    getInternalState(annotator).toolRegistry!,
  )
  return state.toolController
}

export function activateTool(annotator: Annotator, tool: Tool): void {
  requireController(annotator).activate(tool)
}

export function activateToolById(annotator: Annotator, toolId: string): void {
  requireController(annotator).activateById(toolId)
}

export function cancelActiveGesture(annotator: Annotator): void {
  getInternalState(annotator).toolController?.cancel()
}

export function getRegisteredTools(annotator: Annotator): readonly Tool[] {
  return getInternalState(annotator).toolRegistry.list()
}

export function getRegisteredToolsByCategory(
  annotator: Annotator,
  category: ToolCategory,
): readonly Tool[] {
  return getInternalState(annotator).toolRegistry.listByCategory(category)
}

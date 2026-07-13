import { getInternalState } from '../core/annotator.js'
import type { Annotator } from '../core/types.js'
import {
  clientToImage,
  panBy,
  zoomBy,
} from '../image/image-commands.js'
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
        // 橡皮擦预览会改变持久 Mask 的显示结果，因此 annotation 层也要重绘。
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
  // 工具只接收原图坐标，不感知 DOM 位置、缩放比例和 DPR。
  const point = clientToImage(annotator, {
    x: event.clientX,
    y: event.clientY,
  })
  const imagePoint = state.image === null
    ? point
    : {
        // 指针捕获后鼠标可能移出画布，提交点需要裁剪到原图范围。
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
  let activeCursor = 'default'
  let spacePressed = false
  let pointerInside = false
  let panPointerId: number | null = null
  let lastPanPoint = { x: 0, y: 0 }

  canvas.tabIndex = 0

  const down = (event: PointerEvent) => {
    const startsPan = event.button === 1 || (
      event.button === 0 && (event.altKey || spacePressed)
    )
    if (startsPan) {
      // 平移是临时导航手势，不应继续当前绘制或编辑状态。
      event.preventDefault()
      activeTool?.cancel(context)
      panPointerId = event.pointerId
      lastPanPoint = { x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
      return
    }
    if (activeTool === null || event.button !== 0) {
      return
    }
    canvas.focus({ preventScroll: true })
    // 捕获指针后，即使鼠标移出 Canvas 也能收到 move/up。
    canvas.setPointerCapture(event.pointerId)
    activeTool.handle(normalizePointer(annotator, event, 'down'), context)
  }
  const move = (event: PointerEvent) => {
    if (panPointerId === event.pointerId) {
      const next = { x: event.clientX, y: event.clientY }
      panBy(annotator, {
        x: next.x - lastPanPoint.x,
        y: next.y - lastPanPoint.y,
      })
      lastPanPoint = next
      return
    }
    activeTool?.handle(normalizePointer(annotator, event, 'move'), context)
  }
  const up = (event: PointerEvent) => {
    if (panPointerId === event.pointerId) {
      panPointerId = null
      canvas.style.cursor = spacePressed ? 'grab' : activeCursor
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      return
    }
    activeTool?.handle(normalizePointer(annotator, event, 'up'), context)
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }
  const cancelPointer = () => {
    panPointerId = null
    canvas.style.cursor = spacePressed ? 'grab' : activeCursor
    activeTool?.handle({ type: 'cancel' }, context)
  }
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      activeTool?.cancel(context)
      return
    }
    activeTool?.handleKey?.(event, context)
  }
  const windowKeydown = (event: KeyboardEvent) => {
    if (
      event.code !== 'Space' ||
      event.repeat ||
      (!pointerInside && document.activeElement !== canvas)
    ) {
      return
    }
    event.preventDefault()
    spacePressed = true
    // 空格只临时切换为平移，松开后恢复原工具和光标。
    activeTool?.cancel(context)
    canvas.style.cursor = panPointerId === null ? 'grab' : 'grabbing'
  }
  const windowKeyup = (event: KeyboardEvent) => {
    if (event.code !== 'Space' || !spacePressed) {
      return
    }
    event.preventDefault()
    spacePressed = false
    if (panPointerId === null) {
      canvas.style.cursor = activeCursor
    }
  }
  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    const bounds = canvas.getBoundingClientRect()
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 :
      event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? bounds.height : 1
    // 指数缩放让不同滚轮增量保持连续手感，并以鼠标位置作为缩放锚点。
    const factor = Math.exp(-event.deltaY * unit * 0.0015)
    zoomBy(annotator, factor, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }
  const pointerenter = () => {
    pointerInside = true
  }
  const pointerleave = () => {
    pointerInside = false
  }

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancelPointer)
  canvas.addEventListener('pointerenter', pointerenter)
  canvas.addEventListener('pointerleave', pointerleave)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('keydown', keydown)
  window.addEventListener('keydown', windowKeydown)
  window.addEventListener('keyup', windowKeyup)

  return {
    activate(tool) {
      if (destroyed) {
        return
      }
      activeTool?.cancel(context)
      activeTool = tool
      activeCursor = tool.cursor
      canvas.style.cursor = spacePressed ? 'grab' : activeCursor
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
      canvas.removeEventListener('pointerenter', pointerenter)
      canvas.removeEventListener('pointerleave', pointerleave)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('keydown', keydown)
      window.removeEventListener('keydown', windowKeydown)
      window.removeEventListener('keyup', windowKeyup)
    },
  }
}

function requireController(annotator: Annotator): ToolController {
  const state = getInternalState(annotator)
  if (state.renderer === null) {
    throw new Error('An image must be loaded before activating a drawing tool.')
  }
  // 控制器延迟创建：图片加载前不挂载依赖 Canvas 的交互监听。
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

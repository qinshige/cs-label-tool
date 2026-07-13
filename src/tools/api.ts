import { removeAnnotation, updateAnnotationLabel } from '../core/commands.js'
import { getInternalState } from '../core/annotator.js'
import type { Annotator } from '../core/types.js'
import { useBrush, type BrushToolOptions } from './brush-tool.js'
import {
  activateTool,
  activateToolById,
  cancelActiveGesture,
} from './controller.js'
import { useEraser, type EraserToolOptions } from './eraser-tool.js'
import { usePolygon, type PolygonToolOptions } from './polygon-tool.js'
import { useRect, type RectToolOptions } from './rect-tool.js'
import {
  clearSelection,
  getSelection,
  selectAnnotation,
  useSelect,
} from './select-tool.js'
import type { Tool, ToolCategory } from './types.js'

export interface AnnotationToolApi {
  readonly select: () => void
  readonly rect: (options?: Partial<RectToolOptions>) => void
  readonly polygon: (options?: Partial<PolygonToolOptions>) => void
  readonly brush: (options?: Partial<BrushToolOptions>) => void
  readonly eraser: (options?: Partial<EraserToolOptions>) => void
  readonly activate: (tool: Tool) => void
  readonly activateById: (toolId: string) => void
  readonly activeId: () => string | null
  readonly cancel: () => void
  readonly get: (toolId: string) => Tool | undefined
  readonly list: () => readonly Tool[]
  readonly listByCategory: (category: ToolCategory) => readonly Tool[]
  readonly register: (tool: Tool) => void
  readonly unregister: (toolId: string) => void
  readonly selectAnnotation: (annotationId: string) => void
  readonly clearSelection: () => void
  readonly selection: () => readonly string[]
  readonly deleteSelection: () => number
  readonly setSelectionLabel: (labelId: string) => number
}

export function getActiveToolId(annotator: Annotator): string | null {
  return getInternalState(annotator).activeToolId
}

export function deleteSelectedAnnotations(annotator: Annotator): number {
  // 复制选中列表，避免删除标注时 selection:update 影响当前遍历。
  const selectedIds = [...getSelection(annotator)]
  let removed = 0
  for (const id of selectedIds) {
    if (removeAnnotation(annotator, id)) {
      removed += 1
    }
  }
  clearSelection(annotator)
  return removed
}

export function updateSelectedAnnotationsLabel(
  annotator: Annotator,
  labelId: string,
): number {
  const selectedIds = [...getSelection(annotator)]
  for (const id of selectedIds) {
    updateAnnotationLabel(annotator, id, labelId)
  }
  return selectedIds.length
}

export function createToolApi(annotator: Annotator): AnnotationToolApi {
  // 对外暴露绑定 annotator 的门面，业务层调用时不必反复传入实例。
  return Object.freeze({
    select() {
      useSelect(annotator)
    },
    rect(options = {}) {
      useRect(annotator, options)
    },
    polygon(options = {}) {
      usePolygon(annotator, options)
    },
    brush(options = {}) {
      useBrush(annotator, options)
    },
    eraser(options = {}) {
      useEraser(annotator, options)
    },
    activate(tool: Tool) {
      activateTool(annotator, tool)
    },
    activateById(toolId: string) {
      activateToolById(annotator, toolId)
    },
    activeId() {
      return getActiveToolId(annotator)
    },
    cancel() {
      cancelActiveGesture(annotator)
    },
    get(toolId: string) {
      return getInternalState(annotator).toolRegistry.get(toolId)
    },
    list() {
      return getInternalState(annotator).toolRegistry.list()
    },
    listByCategory(category: ToolCategory) {
      return getInternalState(annotator).toolRegistry.listByCategory(category)
    },
    register(tool: Tool) {
      getInternalState(annotator).toolRegistry.register(tool)
    },
    unregister(toolId: string) {
      getInternalState(annotator).toolRegistry.unregister(toolId)
    },
    selectAnnotation(annotationId: string) {
      selectAnnotation(annotator, annotationId)
    },
    clearSelection() {
      clearSelection(annotator)
    },
    selection() {
      return getSelection(annotator)
    },
    deleteSelection() {
      return deleteSelectedAnnotations(annotator)
    },
    setSelectionLabel(labelId: string) {
      return updateSelectedAnnotationsLabel(annotator, labelId)
    },
  })
}

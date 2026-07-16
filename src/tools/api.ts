import { getInternalState } from '../core/annotator.js'
import type { Annotator } from '../core/types.js'
import {
  bringForward,
  bringToFront,
  groupAnnotations,
  removeAnnotations,
  sendBackward,
  sendToBack,
  setAnnotationsHidden,
  setAnnotationsLocked,
  ungroupAnnotations,
  updateAnnotationsLabel,
} from '../core/arrangement-commands.js'
import {
  copyAnnotations,
  duplicateAnnotations,
  pasteAnnotations,
} from '../core/clipboard.js'
import { useBrush, type BrushToolOptions } from './brush-tool.js'
import {
  activateTool,
  activateToolById,
  cancelActiveGesture,
} from './controller.js'
import { useEraser, type EraserToolOptions } from './eraser-tool.js'
import { useEllipse, type EllipseToolOptions } from './ellipse-tool.js'
import { useFreehand, type FreehandToolOptions } from './freehand-tool.js'
import { usePoint, type PointToolOptions } from './point-tool.js'
import { useLasso } from './lasso-tool.js'
import { usePolygon, type PolygonToolOptions } from './polygon-tool.js'
import { usePolyline, type PolylineToolOptions } from './polyline-tool.js'
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
  readonly lasso: () => void
  readonly freehand: (options?: Partial<FreehandToolOptions>) => void
  readonly point: (options?: Partial<PointToolOptions>) => void
  readonly rect: (options?: Partial<RectToolOptions>) => void
  readonly ellipse: (options?: Partial<EllipseToolOptions>) => void
  readonly polyline: (options?: Partial<PolylineToolOptions>) => void
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
  readonly groupSelection: () => string | null
  readonly ungroupSelection: () => number
  readonly lockSelection: (locked?: boolean) => number
  readonly hideSelection: (hidden?: boolean) => number
  readonly bringSelectionForward: () => number
  readonly sendSelectionBackward: () => number
  readonly bringSelectionToFront: () => number
  readonly sendSelectionToBack: () => number
  readonly copySelection: () => number
  readonly paste: () => readonly string[]
  readonly duplicateSelection: () => readonly string[]
}

export function getActiveToolId(annotator: Annotator): string | null {
  return getInternalState(annotator).activeToolId
}

export function deleteSelectedAnnotations(annotator: Annotator): number {
  // 复制选中列表，避免删除标注时 selection:update 影响当前遍历。
  const selectedIds = [...getSelection(annotator)]
  let removed = 0
  removed = removeAnnotations(annotator, selectedIds)
  clearSelection(annotator)
  return removed
}

export function updateSelectedAnnotationsLabel(
  annotator: Annotator,
  labelId: string,
): number {
  const selectedIds = [...getSelection(annotator)]
  return updateAnnotationsLabel(annotator, selectedIds, labelId)
}

export function createToolApi(annotator: Annotator): AnnotationToolApi {
  // 对外暴露绑定 annotator 的门面，业务层调用时不必反复传入实例。
  return Object.freeze({
    select() {
      useSelect(annotator)
    },
    lasso() {
      useLasso(annotator)
    },
    freehand(options = {}) {
      useFreehand(annotator, options)
    },
    point(options = {}) {
      usePoint(annotator, options)
    },
    rect(options = {}) {
      useRect(annotator, options)
    },
    ellipse(options = {}) {
      useEllipse(annotator, options)
    },
    polyline(options = {}) {
      usePolyline(annotator, options)
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
    groupSelection() {
      return groupAnnotations(annotator, getSelection(annotator))
    },
    ungroupSelection() {
      return ungroupAnnotations(annotator, getSelection(annotator))
    },
    lockSelection(locked = true) {
      return setAnnotationsLocked(annotator, getSelection(annotator), locked)
    },
    hideSelection(hidden = true) {
      return setAnnotationsHidden(annotator, getSelection(annotator), hidden)
    },
    bringSelectionForward() {
      return bringForward(annotator, getSelection(annotator))
    },
    sendSelectionBackward() {
      return sendBackward(annotator, getSelection(annotator))
    },
    bringSelectionToFront() {
      return bringToFront(annotator, getSelection(annotator))
    },
    sendSelectionToBack() {
      return sendToBack(annotator, getSelection(annotator))
    },
    copySelection() {
      return copyAnnotations(annotator, getSelection(annotator))
    },
    paste() {
      return pasteAnnotations(annotator)
    },
    duplicateSelection() {
      return duplicateAnnotations(annotator, getSelection(annotator))
    },
  })
}

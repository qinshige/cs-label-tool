import {
  addMask,
  removeAnnotation,
  updateAnnotation,
} from '../core/commands.js'
import { clearSelection, getSelection } from './select-tool.js'
import { queryAnnotations } from '../core/commands.js'
import type { Annotation, Annotator } from '../core/types.js'
import type { Point } from '../geometry/types.js'
import {
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  hasMaskPixels,
  masksIntersect,
  splitBinaryMaskComponents,
  subtractBinaryMask,
} from '../mask/rle.js'
import { getInternalState } from '../core/annotator.js'
import { activateTool } from './controller.js'
import { createBrushMaskGeometry } from './brush-tool.js'
import type {
  NormalizedPointerInput,
  Tool,
  ToolContext,
} from './types.js'

export interface EraserToolOptions {
  readonly size?: number
}

interface EraserToolState {
  readonly pointerId: number | null
  readonly points: readonly Point[]
}

function maskContainsPoint(annotation: Annotation, point: Point): boolean {
  if (annotation.geometry.type !== 'mask') {
    return false
  }
  const x = Math.floor(point.x)
  const y = Math.floor(point.y)
  if (
    x < 0 ||
    y < 0 ||
    x >= annotation.geometry.width ||
    y >= annotation.geometry.height
  ) {
    return false
  }
  const mask = decodeBinaryMaskRle(
    annotation.geometry.rle,
    annotation.geometry.width,
    annotation.geometry.height,
  )
  return mask[y * annotation.geometry.width + x] === 1
}

function eraseMaskStroke(
  annotator: Annotator,
  points: readonly Point[],
  size: number,
): void {
  const image = getInternalState(annotator).image
  if (image === null || points.length < 2) {
    return
  }
  const eraserGeometry = createBrushMaskGeometry({
    imageWidth: image.width,
    imageHeight: image.height,
    brushSize: size,
    points,
  })
  const eraserMask = decodeBinaryMaskRle(
    eraserGeometry.rle,
    eraserGeometry.width,
    eraserGeometry.height,
  )
  const candidates = queryAnnotations(annotator, {
    x: 0,
    y: 0,
    width: eraserGeometry.width,
    height: eraserGeometry.height,
  }).filter(annotation =>
    annotation.geometry.type === 'mask' &&
    annotation.geometry.width === eraserGeometry.width &&
    annotation.geometry.height === eraserGeometry.height,
  )

  for (const annotation of candidates) {
    if (annotation.geometry.type !== 'mask') {
      continue
    }
    const currentMask = decodeBinaryMaskRle(
      annotation.geometry.rle,
      annotation.geometry.width,
      annotation.geometry.height,
    )
    if (!masksIntersect(currentMask, eraserMask)) {
      continue
    }
    const nextMask = subtractBinaryMask(currentMask, eraserMask)
    const components = splitBinaryMaskComponents(
      nextMask,
      annotation.geometry.width,
      annotation.geometry.height,
    )
    const firstComponent = components[0]
    if (firstComponent !== undefined && hasMaskPixels(firstComponent)) {
      updateAnnotation(annotator, annotation.id, {
        type: 'mask',
        width: annotation.geometry.width,
        height: annotation.geometry.height,
        rle: encodeBinaryMaskRle(firstComponent),
      })
      for (const component of components.slice(1)) {
        addMask(annotator, {
          labelId: annotation.labelId,
          width: annotation.geometry.width,
          height: annotation.geometry.height,
          rle: encodeBinaryMaskRle(component),
        })
      }
    } else {
      removeAnnotation(annotator, annotation.id)
    }
  }
}

export function createEraserTool(options: EraserToolOptions = {}): Tool {
  const size = options.size ?? 10
  let state: EraserToolState = { pointerId: null, points: [] }

  return {
    id: 'eraser',
    name: '橡皮擦',
    description: '擦除涂抹区域',
    icon: '🧹',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'e' }],
    handle(input: NormalizedPointerInput, context: ToolContext) {
      if (input.type === 'cancel') {
        state = { pointerId: null, points: [] }
        context.clearDraft()
        clearSelection(context.annotator)
        return
      }

      if (input.type === 'down') {
        state = { pointerId: input.pointerId, points: [input.imagePoint] }
        context.setDraft({ type: 'eraser', points: state.points, size })
        return
      }

      if (input.type === 'move') {
        if (state.pointerId !== input.pointerId || (input.buttons & 1) === 0) {
          return
        }
        state = { pointerId: input.pointerId, points: [...state.points, input.imagePoint] }
        context.setDraft({ type: 'eraser', points: state.points, size })
        return
      }

      if (input.type === 'up') {
        if (state.pointerId !== input.pointerId) {
          return
        }
        eraseMaskStroke(
          context.annotator,
          [...state.points, input.imagePoint],
          size,
        )
        const selected = getSelection(context.annotator)
          .filter(id => {
            const annotation = queryAnnotations(context.annotator, {
              x: 0,
              y: 0,
              width: Number.MAX_SAFE_INTEGER,
              height: Number.MAX_SAFE_INTEGER,
            }).find(item => item.id === id)
            return annotation === undefined || annotation.geometry.type === 'mask'
          })
        if (selected.length > 0) {
          clearSelection(context.annotator)
        }
        state = { pointerId: null, points: [] }
        context.clearDraft()
      }
    },
    cancel(context) {
      state = { pointerId: null, points: [] }
      context.clearDraft()
      clearSelection(context.annotator)
    },
  }
}

export function useEraser(
  annotator: Annotator,
  options: Partial<EraserToolOptions> = {},
): void {
  activateTool(annotator, createEraserTool(options))
}

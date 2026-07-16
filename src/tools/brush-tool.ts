import type { Point } from '../geometry/types.js'
import type { Annotator } from '../core/types.js'
import { getActiveLabel } from '../labels/labels.js'
import { AnnotatorError, type MaskGeometry } from '../core/types.js'
import { activateTool } from './controller.js'
import { getInternalState } from '../core/annotator.js'
import {
  addMask,
  queryAnnotations,
  removeAnnotation,
  updateAnnotation,
} from '../core/commands.js'
import {
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  mergeBinaryMasks,
  masksIntersect,
} from '../mask/rle.js'
import type {
  NormalizedPointerInput,
  Tool,
  ToolContext,
} from './types.js'

export interface BrushToolOptions {
  readonly labelId?: string
  readonly size?: number
  readonly color?: string
}

export interface BrushToolState {
  readonly pointerId: number | null
  readonly points: readonly Point[]
}

export interface BrushMaskInput {
  readonly imageWidth: number
  readonly imageHeight: number
  readonly brushSize: number
  readonly points: readonly Point[]
}

function resolveLabelId(
  annotator: Annotator,
  configuredLabelId: string | undefined,
): string {
  const labelId = configuredLabelId ?? getActiveLabel(annotator)
  if (labelId === null) {
    throw new AnnotatorError(
      'UNKNOWN_LABEL',
      'A label must be active before using the brush tool.',
    )
  }
  return labelId
}

function paintCircle(
  mask: Uint8Array,
  width: number,
  height: number,
  point: Point,
  radius: number,
): void {
  // 每个采样点绘制一个实心圆，圆形叠加后形成连续笔迹。
  const minX = Math.max(0, Math.floor(point.x - radius))
  const maxX = Math.min(width - 1, Math.ceil(point.x + radius))
  const minY = Math.max(0, Math.floor(point.y - radius))
  const maxY = Math.min(height - 1, Math.ceil(point.y + radius))
  const radiusSquared = radius * radius
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - point.x
      const dy = y + 0.5 - point.y
      if (dx * dx + dy * dy <= radiusSquared) {
        mask[y * width + x] = 1
      }
    }
  }
}

function interpolateStroke(points: readonly Point[], step: number): Point[] {
  // PointerEvent 采样可能稀疏，按距离补点避免快速拖动时出现断线。
  const sampled: Point[] = []
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const previous = points[index - 1]
    if (current === undefined) {
      continue
    }
    if (previous === undefined) {
      sampled.push(current)
      continue
    }
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    const distance = Math.hypot(dx, dy)
    const segments = Math.max(1, Math.ceil(distance / step))
    for (let segment = 1; segment <= segments; segment += 1) {
      sampled.push({
        x: previous.x + (dx * segment) / segments,
        y: previous.y + (dy * segment) / segments,
      })
    }
  }
  return sampled
}

export function createBrushMaskGeometry(input: BrushMaskInput): MaskGeometry {
  const width = Math.max(1, Math.round(input.imageWidth))
  const height = Math.max(1, Math.round(input.imageHeight))
  const brushSize = Math.max(1, input.brushSize)
  const radius = brushSize / 2
  const mask = new Uint8Array(width * height)
  for (const point of interpolateStroke(input.points, Math.max(1, radius / 2))) {
    paintCircle(mask, width, height, point, radius)
  }
  return {
    type: 'mask',
    width,
    height,
    rle: encodeBinaryMaskRle(mask),
  }
}

function mergeBrushMask(
  annotator: Annotator,
  labelId: string,
  geometry: MaskGeometry,
): void {
  const brushMask = decodeBinaryMaskRle(
    geometry.rle,
    geometry.width,
    geometry.height,
  )
  const intersectingMasks = queryAnnotations(annotator, {
    x: 0,
    y: 0,
    width: geometry.width,
    height: geometry.height,
  }).filter(annotation => {
    // 只合并同标签、同图片尺寸并且像素真实相交的 Mask。
    if (
      annotation.labelId !== labelId ||
      annotation.geometry.type !== 'mask' ||
      annotation.geometry.width !== geometry.width ||
      annotation.geometry.height !== geometry.height
    ) {
      return false
    }
    const existingMask = decodeBinaryMaskRle(
      annotation.geometry.rle,
      annotation.geometry.width,
      annotation.geometry.height,
    )
    return masksIntersect(existingMask, brushMask)
  })

  if (intersectingMasks.length === 0) {
    addMask(annotator, { labelId, ...geometry })
    return
  }

  let merged = brushMask
  for (const annotation of intersectingMasks) {
    if (annotation.geometry.type !== 'mask') {
      continue
    }
    merged = mergeBinaryMasks(
      merged,
      decodeBinaryMaskRle(
        annotation.geometry.rle,
        annotation.geometry.width,
        annotation.geometry.height,
      ),
    )
  }

  const [target, ...duplicates] = intersectingMasks
  if (target === undefined || target.geometry.type !== 'mask') {
    return
  }
  updateAnnotation(annotator, target.id, {
    type: 'mask',
    width: geometry.width,
    height: geometry.height,
    rle: encodeBinaryMaskRle(merged),
  })
  for (const duplicate of duplicates) {
    // 保留第一条标注的 ID，其余重叠标注在合并后删除。
    removeAnnotation(annotator, duplicate.id)
  }
}

export function createBrushTool(options: BrushToolOptions = {}): Tool {
  let state: BrushToolState = { pointerId: null, points: [] }
  const brushSize = Math.max(1, options.size ?? 10)

  return {
    id: 'brush',
    name: '涂抹',
    description: '在图像上绘制笔触',
    icon: '🖌️',
    cursor: 'crosshair',
    category: 'drawing',
    shortcuts: [{ key: 'b' }],
    handle(input: NormalizedPointerInput, context: ToolContext) {
      const internal = getInternalState(context.annotator)
      if (input.type === 'cancel') {
        state = { pointerId: null, points: [] }
        context.clearDraft()
        return
      }

      if (input.type === 'down') {
        const labelId = resolveLabelId(context.annotator, options.labelId)
        const color = options.color ?? internal.labels.find(
          label => label.id === labelId,
        )?.color ?? '#ff4d4f'
        state = { pointerId: input.pointerId, points: [input.imagePoint] }
        context.setDraft({
          type: 'brush',
          points: state.points,
          size: brushSize,
          color,
          labelId,
        })
        return
      }

      if (input.type === 'move') {
        // hover 不属于笔迹；必须是同一 pointer 且左键仍按住。
        if (state.pointerId !== input.pointerId || (input.buttons & 1) === 0) {
          return
        }
        state = { pointerId: input.pointerId, points: [...state.points, input.imagePoint] }
        const labelId = resolveLabelId(context.annotator, options.labelId)
        const color = options.color ?? internal.labels.find(
          label => label.id === labelId,
        )?.color ?? '#ff4d4f'
        context.setDraft({
          type: 'brush',
          points: state.points,
          size: brushSize,
          color,
          labelId,
        })
        return
      }

      if (input.type === 'up') {
        if (state.pointerId !== input.pointerId) {
          return
        }
        const points = [...state.points, input.imagePoint]
        const image = internal.image
        if (points.length >= 2 && image !== null) {
          const labelId = resolveLabelId(context.annotator, options.labelId)
          mergeBrushMask(
            context.annotator,
            labelId,
            createBrushMaskGeometry({
              imageWidth: image.width,
              imageHeight: image.height,
              brushSize,
              points,
            }),
          )
        }
        state = { pointerId: null, points: [] }
        context.clearDraft()
      }
    },
    cancel(context) {
      state = { pointerId: null, points: [] }
      context.clearDraft()
    },
  }
}

export function useBrush(
  annotator: Annotator,
  options: Partial<BrushToolOptions> = {},
): void {
  resolveLabelId(annotator, options.labelId)
  activateTool(annotator, createBrushTool(options))
}

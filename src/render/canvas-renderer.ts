import { getInternalState } from '../core/annotator.js'
import { subscribe } from '../core/events.js'
import type {
  Annotator,
  MaskAnnotation,
  PolygonAnnotation,
  RectAnnotation,
} from '../core/types.js'
import { screenToImage } from '../viewport/viewport.js'
import { queryAnnotations } from '../core/commands.js'
import {
  decodeBinaryMaskRle,
  getBinaryMaskBounds,
} from '../mask/rle.js'
import { createCanvasLayers } from './canvas-layers.js'
import { createRenderScheduler, type RenderLayer } from './scheduler.js'
import type { EraserInteractionDraft } from '../tools/types.js'

export interface CanvasRenderer {
  readonly eventCanvas: HTMLCanvasElement
  readonly invalidate: (layer: RenderLayer) => void
  readonly resize: () => void
  readonly destroy: () => void
}

function resetAndClear(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  // clearRect 会受当前 transform 影响，清空前必须恢复单位矩阵。
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
}

function renderMaskAnnotation(
  context: CanvasRenderingContext2D,
  annotation: MaskAnnotation,
  color: string,
  eraserDraft?: EraserInteractionDraft,
): void {
  // Mask 先在原图尺寸的离屏 Canvas 上生成，再复用主 Canvas 的 viewport 变换绘制。
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = annotation.geometry.width
  maskCanvas.height = annotation.geometry.height
  const maskContext = maskCanvas.getContext('2d')
  if (maskContext === null) {
    return
  }
  const imageData = maskContext.createImageData(
    annotation.geometry.width,
    annotation.geometry.height,
  )
  const mask = decodeBinaryMaskRle(
    annotation.geometry.rle,
    annotation.geometry.width,
    annotation.geometry.height,
  )
  const colorMatch = /^#?([0-9a-f]{6})$/i.exec(color)
  const hex = colorMatch?.[1] ?? '2c9c21'
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1) {
      continue
    }
    const offset = index * 4
    imageData.data[offset] = red
    imageData.data[offset + 1] = green
    imageData.data[offset + 2] = blue
    imageData.data[offset + 3] = 96
  }
  maskContext.putImageData(imageData, 0, 0)
  const firstEraserPoint = eraserDraft?.points[0]
  if (eraserDraft !== undefined && firstEraserPoint !== undefined) {
    // 实时预览只改离屏画面；真正的 Mask 数据在 pointerup 时一次性提交。
    maskContext.globalCompositeOperation = 'destination-out'
    maskContext.beginPath()
    maskContext.moveTo(firstEraserPoint.x, firstEraserPoint.y)
    for (const point of eraserDraft.points.slice(1)) {
      maskContext.lineTo(point.x, point.y)
    }
    if (eraserDraft.points.length === 1) {
      maskContext.lineTo(firstEraserPoint.x, firstEraserPoint.y)
    }
    maskContext.lineWidth = eraserDraft.size
    maskContext.lineCap = 'round'
    maskContext.lineJoin = 'round'
    maskContext.stroke()
    maskContext.globalCompositeOperation = 'source-over'
  }
  context.drawImage(maskCanvas, 0, 0)
}

export function createCanvasRenderer(annotator: Annotator): CanvasRenderer {
  const state = getInternalState(annotator)
  const layers = createCanvasLayers(state.container)
  let layerSize = layers.resize()

  const renderImage = () => {
    const canvas = layers.canvases.image
    const context = canvas.getContext('2d')
    if (context === null) {
      return
    }
    resetAndClear(context, canvas)
    if (state.image === null || state.viewport === null) {
      return
    }
    const { scale, offsetX, offsetY } = state.viewport
    // 缩小时使用高质量插值；放大时保留原始像素边界。
    context.imageSmoothingEnabled = scale < 1
    context.imageSmoothingQuality = 'high'
    context.setTransform(
      layerSize.dpr * scale,
      0,
      0,
      layerSize.dpr * scale,
      layerSize.dpr * offsetX,
      layerSize.dpr * offsetY,
    )
    context.drawImage(state.image.source, 0, 0)
  }

  const renderAnnotations = () => {
    const canvas = layers.canvases.annotations
    const context = canvas.getContext('2d')
    if (context === null) {
      return
    }
    resetAndClear(context, canvas)
    if (state.viewport === null) {
      return
    }
    const topLeft = screenToImage(state.viewport, { x: 0, y: 0 })
    const bottomRight = screenToImage(state.viewport, {
      x: layerSize.width,
      y: layerSize.height,
    })
    // 只查询当前 viewport 内可能可见的标注。
    const annotations = queryAnnotations(annotator, {
      x: Math.min(topLeft.x, bottomRight.x),
      y: Math.min(topLeft.y, bottomRight.y),
      width: Math.abs(bottomRight.x - topLeft.x),
      height: Math.abs(bottomRight.y - topLeft.y),
    })
    const { scale, offsetX, offsetY } = state.viewport
    context.imageSmoothingEnabled = false
    context.setTransform(
      layerSize.dpr * scale,
      0,
      0,
      layerSize.dpr * scale,
      layerSize.dpr * offsetX,
      layerSize.dpr * offsetY,
    )
    context.lineWidth = 2 / scale

    for (const annotation of annotations) {
      if (
        state.interactionDraft?.type === 'vector' &&
        state.interactionDraft.annotationId === annotation.id &&
        state.interactionDraft.geometry.type === 'mask'
      ) {
        // Mask 拖拽时由 interaction 层绘制新位置，持久层暂时隐藏旧位置。
        continue
      }
      const label = state.labels.find(item => item.id === annotation.labelId)
      context.strokeStyle = label?.color ?? '#2c9c21'
      context.fillStyle = label?.color ?? '#2c9c21'
      context.globalAlpha = 1

      let labelX = 0
      let labelY = 0

      if (annotation.geometry.type === 'rect') {
        const rect = annotation as RectAnnotation
        labelX = rect.geometry.x
        labelY = rect.geometry.y
        context.globalAlpha = 0.16
        context.fillRect(
          rect.geometry.x,
          rect.geometry.y,
          rect.geometry.width,
          rect.geometry.height,
        )
        context.globalAlpha = 1
        context.strokeRect(
          rect.geometry.x,
          rect.geometry.y,
          rect.geometry.width,
          rect.geometry.height,
        )
      } else if (annotation.geometry.type === 'polygon') {
        const polygon = annotation as PolygonAnnotation
        const first = polygon.geometry.points[0]
        if (first === undefined) {
          continue
        }
        labelX = first[0]
        labelY = first[1]
        context.beginPath()
        context.moveTo(first[0], first[1])
        for (const [x, y] of polygon.geometry.points.slice(1)) {
          context.lineTo(x, y)
        }
        context.closePath()
        context.globalAlpha = 0.16
        context.fill()
        context.globalAlpha = 1
        context.stroke()
      } else if (annotation.geometry.type === 'mask') {
        const mask = annotation as MaskAnnotation
        const maskPixels = decodeBinaryMaskRle(
          mask.geometry.rle,
          mask.geometry.width,
          mask.geometry.height,
        )
        // 标签和选框使用真实像素边界，不能固定放在整图左上角。
        const maskBounds = getBinaryMaskBounds(
          maskPixels,
          mask.geometry.width,
          mask.geometry.height,
        )
        labelX = maskBounds?.x ?? 0
        labelY = maskBounds?.y ?? 0
        const eraserDraft = state.interactionDraft?.type === 'eraser'
          ? state.interactionDraft
          : undefined
        renderMaskAnnotation(
          context,
          mask,
          label?.color ?? '#2c9c21',
          eraserDraft,
        )
      }

      if (label?.name) {
        context.font = `${14 / scale}px sans-serif`
        context.fillStyle = '#ffffff'
        context.strokeStyle = label.color
        context.lineWidth = 3 / scale
        context.lineJoin = 'round'
        context.globalAlpha = 1

        const textWidth = context.measureText(label.name).width
        const textHeight = 14 / scale
        const padding = 4 / scale

        context.strokeRect(
          labelX - padding,
          labelY - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2,
        )
        context.fillRect(
          labelX - padding,
          labelY - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2,
        )
        context.fillStyle = label.color
        context.fillText(label.name, labelX, labelY - padding)
      }
    }
  }

  const scheduler = createRenderScheduler({
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle),
    render(dirtyLayers) {
      // 每层只在被标记为 dirty 时重绘。
      if (dirtyLayers.has('image')) {
        renderImage()
      }
      if (dirtyLayers.has('annotations')) {
        renderAnnotations()
      }
      if (dirtyLayers.has('interaction')) {
        const canvas = layers.canvases.interaction
        const context = canvas.getContext('2d')
        if (context !== null) {
          resetAndClear(context, canvas)
          const draft = state.interactionDraft
          if (draft !== null && state.viewport !== null) {
            const label = 'labelId' in draft
              ? state.labels.find(item => item.id === draft.labelId)
              : undefined
            const { scale, offsetX, offsetY } = state.viewport
            context.imageSmoothingEnabled = false
            context.setTransform(
              layerSize.dpr * scale,
              0,
              0,
              layerSize.dpr * scale,
              layerSize.dpr * offsetX,
              layerSize.dpr * offsetY,
            )
            context.strokeStyle = label?.color ?? '#2c9c21'
            context.lineWidth = 2 / scale
            context.setLineDash([6 / scale, 4 / scale])
            if (draft.type === 'vector' && draft.geometry.type === 'mask') {
              const source = state.annotationsById.get(draft.annotationId)
              if (source?.geometry.type === 'mask') {
                renderMaskAnnotation(
                  context,
                  { ...source, geometry: draft.geometry },
                  label?.color ?? '#2c9c21',
                )
              }
            } else if (draft.type === 'brush') {
              // 画笔预览使用工具配置色；提交后的 Mask 使用标签色。
              context.strokeStyle = draft.color
              const first = draft.points[0]
              if (first !== undefined) {
                context.beginPath()
                context.moveTo(first.x, first.y)
                for (const point of draft.points.slice(1)) {
                  context.lineTo(point.x, point.y)
                }
                if (draft.points.length === 1) {
                  context.lineTo(first.x, first.y)
                }
                context.globalAlpha = 0.7
                context.lineWidth = draft.size
                context.lineCap = 'round'
                context.lineJoin = 'round'
                context.setLineDash([])
                context.stroke()
              }
            } else if (draft.type === 'rect') {
              context.strokeRect(
                draft.geometry.x,
                draft.geometry.y,
                draft.geometry.width,
                draft.geometry.height,
              )
            } else if (draft.type !== 'eraser') {
              const points = draft.type === 'polygon'
                ? draft.points.map(point => [point.x, point.y] as const)
                : draft.geometry.type === 'polygon'
                  ? draft.geometry.points
                  : []
              if (draft.type === 'vector' && draft.geometry.type === 'rect') {
                context.strokeRect(
                  draft.geometry.x,
                  draft.geometry.y,
                  draft.geometry.width,
                  draft.geometry.height,
                )
              } else if (points[0] !== undefined) {
                context.beginPath()
                context.moveTo(points[0][0], points[0][1])
                for (const point of points.slice(1)) {
                  context.lineTo(point[0], point[1])
                }
                if (draft.type === 'vector') {
                  context.closePath()
                }
                context.stroke()
              }
            }
          }
          if (state.viewport !== null) {
            // 选框和控制点也属于 interaction 层，尺寸始终按屏幕像素保持稳定。
            const { scale, offsetX, offsetY } = state.viewport
            context.setTransform(
              layerSize.dpr * scale,
              0,
              0,
              layerSize.dpr * scale,
              layerSize.dpr * offsetX,
              layerSize.dpr * offsetY,
            )
            const size = 8 / scale
            context.setLineDash([])
            for (const id of state.selectedIds) {
              const annotation = state.annotationsById.get(id)
              if (annotation === undefined) {
                continue
              }
              const geometry = state.interactionDraft?.type === 'vector' &&
                state.interactionDraft.annotationId === id
                ? state.interactionDraft.geometry
                : annotation.geometry
              const points = geometry.type === 'rect'
                ? [
                    [geometry.x, geometry.y],
                    [geometry.x + geometry.width / 2, geometry.y],
                    [geometry.x + geometry.width, geometry.y],
                    [geometry.x + geometry.width, geometry.y + geometry.height / 2],
                    [geometry.x + geometry.width, geometry.y + geometry.height],
                    [geometry.x + geometry.width / 2, geometry.y + geometry.height],
                    [geometry.x, geometry.y + geometry.height],
                    [geometry.x, geometry.y + geometry.height / 2],
                  ] as const
                : geometry.type === 'polygon'
                  ? geometry.points
                  : []
              context.fillStyle = '#ffffff'
              context.strokeStyle = '#1677ff'
              context.globalAlpha = 1
              if (geometry.type === 'mask') {
                const maskBounds = getBinaryMaskBounds(
                  decodeBinaryMaskRle(
                    geometry.rle,
                    geometry.width,
                    geometry.height,
                  ),
                  geometry.width,
                  geometry.height,
                )
                if (maskBounds !== null) {
                  context.setLineDash([5 / scale, 3 / scale])
                  context.lineWidth = 2 / scale
                  context.strokeRect(
                    maskBounds.x,
                    maskBounds.y,
                    maskBounds.width,
                    maskBounds.height,
                  )
                  context.setLineDash([])
                }
              }
              for (const [x, y] of points) {
                context.fillRect(x - size / 2, y - size / 2, size, size)
                context.strokeRect(x - size / 2, y - size / 2, size, size)
              }
            }
          }
        }
      }
    },
  })
  const unsubscribe = subscribe(annotator, 'change', event => {
    if (event.kind !== 'label:activate') {
      // 标注变化后同时刷新控制点，避免数据已更新但选框仍停在旧位置。
      scheduler.invalidate('annotations')
      scheduler.invalidate('interaction')
    }
  })
  let destroyed = false

  return {
    eventCanvas: layers.canvases.event,
    invalidate: layer => scheduler.invalidate(layer),
    resize() {
      if (destroyed) {
        return
      }
      layerSize = layers.resize()
      scheduler.invalidate('image')
      scheduler.invalidate('annotations')
      scheduler.invalidate('interaction')
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      unsubscribe()
      scheduler.destroy()
      layers.destroy()
    },
  }
}

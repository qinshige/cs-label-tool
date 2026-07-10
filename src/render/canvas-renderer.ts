import { getInternalState } from '../core/annotator.js'
import { subscribe } from '../core/events.js'
import type { Annotator, PolygonAnnotation, RectAnnotation } from '../core/types.js'
import { screenToImage } from '../viewport/viewport.js'
import { queryAnnotations } from '../core/commands.js'
import { createCanvasLayers } from './canvas-layers.js'
import { createRenderScheduler, type RenderLayer } from './scheduler.js'

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
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
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
    const annotations = queryAnnotations(annotator, {
      x: Math.min(topLeft.x, bottomRight.x),
      y: Math.min(topLeft.y, bottomRight.y),
      width: Math.abs(bottomRight.x - topLeft.x),
      height: Math.abs(bottomRight.y - topLeft.y),
    })
    const { scale, offsetX, offsetY } = state.viewport
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
      const label = state.labels.find(item => item.id === annotation.labelId)
      context.strokeStyle = label?.color ?? '#2c9c21'
      context.fillStyle = label?.color ?? '#2c9c21'
      context.globalAlpha = 1
      if (annotation.geometry.type === 'rect') {
        const rect = annotation as RectAnnotation
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
      } else {
        const polygon = annotation as PolygonAnnotation
        const first = polygon.geometry.points[0]
        if (first === undefined) {
          continue
        }
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
      }
    }
  }

  const scheduler = createRenderScheduler({
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle),
    render(dirtyLayers) {
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
            const label = state.labels.find(item => item.id === draft.labelId)
            const { scale, offsetX, offsetY } = state.viewport
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
            if (draft.type === 'rect') {
              context.strokeRect(
                draft.geometry.x,
                draft.geometry.y,
                draft.geometry.width,
                draft.geometry.height,
              )
            } else {
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
              const points = annotation.geometry.type === 'rect'
                ? [
                    [annotation.geometry.x, annotation.geometry.y],
                    [annotation.geometry.x + annotation.geometry.width / 2, annotation.geometry.y],
                    [annotation.geometry.x + annotation.geometry.width, annotation.geometry.y],
                    [annotation.geometry.x + annotation.geometry.width, annotation.geometry.y + annotation.geometry.height / 2],
                    [annotation.geometry.x + annotation.geometry.width, annotation.geometry.y + annotation.geometry.height],
                    [annotation.geometry.x + annotation.geometry.width / 2, annotation.geometry.y + annotation.geometry.height],
                    [annotation.geometry.x, annotation.geometry.y + annotation.geometry.height],
                    [annotation.geometry.x, annotation.geometry.y + annotation.geometry.height / 2],
                  ] as const
                : annotation.geometry.points
              context.fillStyle = '#ffffff'
              context.strokeStyle = '#1677ff'
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
      scheduler.invalidate('annotations')
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

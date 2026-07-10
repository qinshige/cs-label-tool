import type { RenderLayer } from './scheduler.js'

export type CanvasLayerName = RenderLayer | 'event'

export interface CanvasLayerSet {
  readonly canvases: Readonly<Record<CanvasLayerName, HTMLCanvasElement>>
  readonly resize: () => CanvasLayerSize
  readonly destroy: () => void
}

export interface CanvasLayerSize {
  readonly width: number
  readonly height: number
  readonly dpr: number
}

const layerNames: readonly CanvasLayerName[] = [
  'image',
  'annotations',
  'interaction',
  'event',
]

export function createCanvasLayers(container: HTMLElement): CanvasLayerSet {
  const originalPosition = container.style.position
  const originalOverflow = container.style.overflow
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }
  container.style.overflow = 'hidden'

  const entries = layerNames.map((name, index) => {
    const canvas = document.createElement('canvas')
    canvas.dataset.layer = name
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.zIndex = String(index)
    canvas.style.pointerEvents = name === 'event' ? 'auto' : 'none'
    container.append(canvas)
    return [name, canvas] as const
  })
  const canvases = Object.fromEntries(entries) as Record<
    CanvasLayerName,
    HTMLCanvasElement
  >

  return {
    canvases,
    resize() {
      const bounds = container.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      for (const canvas of Object.values(canvases)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
      return { width, height, dpr }
    },
    destroy() {
      for (const canvas of Object.values(canvases)) {
        canvas.remove()
      }
      container.style.position = originalPosition
      container.style.overflow = originalOverflow
    },
  }
}

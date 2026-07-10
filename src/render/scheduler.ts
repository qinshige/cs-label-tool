export type RenderLayer =
  | 'annotations'
  | 'image'
  | 'interaction'

export interface RenderSchedulerOptions {
  readonly requestFrame: (callback: FrameRequestCallback) => number
  readonly cancelFrame: (handle: number) => void
  readonly render: (layers: ReadonlySet<RenderLayer>) => void
}

export interface RenderScheduler {
  readonly invalidate: (layer: RenderLayer) => void
  readonly destroy: () => void
}

export function createRenderScheduler(
  options: RenderSchedulerOptions,
): RenderScheduler {
  const dirtyLayers = new Set<RenderLayer>()
  let frame: number | null = null
  let destroyed = false

  const flush = () => {
    frame = null
    if (destroyed || dirtyLayers.size === 0) {
      return
    }
    const layers = new Set(dirtyLayers)
    dirtyLayers.clear()
    options.render(layers)
  }

  return {
    invalidate(layer) {
      if (destroyed) {
        return
      }
      dirtyLayers.add(layer)
      if (frame === null) {
        frame = options.requestFrame(flush)
      }
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      dirtyLayers.clear()
      if (frame !== null) {
        options.cancelFrame(frame)
        frame = null
      }
    },
  }
}

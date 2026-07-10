import { getInternalState } from '../core/annotator.js'
import { emitChange } from '../core/events.js'
import type { Annotator } from '../core/types.js'
import type { Point, Size } from '../geometry/types.js'
import { createCanvasRenderer } from '../render/canvas-renderer.js'
import {
  createViewport,
  fitViewport,
  imageToScreen,
  panViewport,
  screenToImage,
  zoomAt,
} from '../viewport/viewport.js'
import type { ImageSource } from './types.js'

function getContainerSize(container: HTMLElement): Size {
  const bounds = container.getBoundingClientRect()
  return {
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  }
}

function requireViewport(annotator: Annotator) {
  const state = getInternalState(annotator)
  if (state.viewport === null) {
    throw new Error('An image must be loaded before using viewport commands.')
  }
  return { state, viewport: state.viewport }
}

export async function setImageSource(
  annotator: Annotator,
  source: ImageSource,
): Promise<void> {
  const state = getInternalState(annotator)
  const hadImage = state.image !== null
  state.imageAbortController?.abort()
  state.imageAbortController = null
  state.image = null
  state.viewport = null
  state.toolController?.cancel()
  state.interactionDraft = null
  state.renderer?.invalidate('image')
  state.renderer?.invalidate('annotations')
  state.renderer?.invalidate('interaction')
  state.imageSource?.dispose()
  state.imageSource = null
  if (hadImage) {
    emitChange(annotator, 'image:clear')
  }

  const controller = new AbortController()
  state.imageAbortController = controller
  state.imageSource = source
  const image = await source.load(controller.signal)
  const currentState = getInternalState(annotator)
  if (currentState.imageSource !== source || controller.signal.aborted) {
    return
  }

  currentState.image = image
  const containerSize = getContainerSize(currentState.container)
  currentState.viewport = fitViewport(
    createViewport(containerSize),
    { width: image.width, height: image.height },
  )
  currentState.renderer ??= createCanvasRenderer(annotator)
  currentState.renderer.resize()
  currentState.renderer.invalidate('image')
  currentState.renderer.invalidate('annotations')
  emitChange(annotator, 'image:load')
}

export function hasImage(annotator: Annotator): boolean {
  return getInternalState(annotator).image !== null
}

export function getZoom(annotator: Annotator): number {
  return requireViewport(annotator).viewport.scale
}

export function resizeViewport(annotator: Annotator): void {
  const { state, viewport } = requireViewport(annotator)
  const size = getContainerSize(state.container)
  state.viewport = { ...viewport, ...size }
  state.renderer?.resize()
}

export function fitToScreen(annotator: Annotator): void {
  const { state, viewport } = requireViewport(annotator)
  if (state.image === null) {
    return
  }
  state.viewport = fitViewport(viewport, state.image)
  state.renderer?.invalidate('image')
  state.renderer?.invalidate('annotations')
}

export function zoomTo(
  annotator: Annotator,
  scale: number,
  anchor?: Point,
): void {
  const { state, viewport } = requireViewport(annotator)
  state.viewport = zoomAt(
    viewport,
    anchor ?? { x: viewport.width / 2, y: viewport.height / 2 },
    scale,
  )
  state.renderer?.invalidate('image')
  state.renderer?.invalidate('annotations')
}

export function zoomBy(
  annotator: Annotator,
  factor: number,
  anchor?: Point,
): void {
  const { viewport } = requireViewport(annotator)
  zoomTo(annotator, viewport.scale * factor, anchor)
}

export function panBy(annotator: Annotator, delta: Point): void {
  const { state, viewport } = requireViewport(annotator)
  state.viewport = panViewport(viewport, delta)
  state.renderer?.invalidate('image')
  state.renderer?.invalidate('annotations')
}

export function imageToClient(annotator: Annotator, point: Point): Point {
  const { state, viewport } = requireViewport(annotator)
  const screenPoint = imageToScreen(viewport, point)
  const bounds = state.container.getBoundingClientRect()
  return { x: screenPoint.x + bounds.left, y: screenPoint.y + bounds.top }
}

export function clientToImage(annotator: Annotator, point: Point): Point {
  const { state, viewport } = requireViewport(annotator)
  const bounds = state.container.getBoundingClientRect()
  return screenToImage(viewport, {
    x: point.x - bounds.left,
    y: point.y - bounds.top,
  })
}

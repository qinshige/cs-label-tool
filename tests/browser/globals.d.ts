import type { AnnotationSnapshot, Annotator } from '../../src/index.js'
import type { Bounds } from '../../src/index.js'

declare global {
  interface Window {
    getTestSnapshot: (annotator?: Annotator) => AnnotationSnapshot
    testAnnotator: Annotator
    unmountTestAnnotator: () => void
    controlsDisabledBeforeImage: boolean
    getTestZoom: () => number
    copiedSnapshotJson?: string
    demoTest: {
      addRect: (labelId: string, bounds: Bounds) => string
      hasImagePixels: () => boolean
      imageToClient: (point: { x: number; y: number }) => { x: number; y: number }
      selection: () => readonly string[]
      snapshot: () => AnnotationSnapshot
    }
    vectorTest: {
      ids: { rectId: string; polygonId: string }
      pointToClient: (point: { x: number; y: number }) => { x: number; y: number }
      snapshot: () => AnnotationSnapshot
      selection: () => readonly string[]
      undo: () => boolean
      redo: () => boolean
      zoom: (scale: number) => void
      zoomAtPoint: (scale: number, point: { x: number; y: number }) => void
    }
  }
}

export {}

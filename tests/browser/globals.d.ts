import type { AnnotationSnapshot, Annotator } from '../../src/index.js'

declare global {
  interface Window {
    getTestSnapshot: (annotator?: Annotator) => AnnotationSnapshot
    vectorTest: {
      ids: { rectId: string; polygonId: string }
      pointToClient: (point: { x: number; y: number }) => { x: number; y: number }
      snapshot: () => AnnotationSnapshot
      selection: () => readonly string[]
      undo: () => boolean
      redo: () => boolean
      zoom: (scale: number) => void
    }
  }
}

export {}

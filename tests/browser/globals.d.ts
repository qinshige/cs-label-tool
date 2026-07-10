import type { AnnotationSnapshot, Annotator } from '../../src/index.js'

declare global {
  interface Window {
    getTestSnapshot: (annotator?: Annotator) => AnnotationSnapshot
  }
}

export {}

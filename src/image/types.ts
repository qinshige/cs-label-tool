export interface LoadedImage {
  readonly source: CanvasImageSource
  readonly width: number
  readonly height: number
}

export interface ImageSource {
  readonly id: string
  readonly load: (signal: AbortSignal) => Promise<LoadedImage>
  readonly dispose: () => void
}

export type StandardImageInput = string | Blob | ImageBitmap

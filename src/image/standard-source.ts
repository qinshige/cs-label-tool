import type {
  ImageSource,
  LoadedImage,
  StandardImageInput,
} from './types.js'

function createAbortError(): DOMException {
  return new DOMException('Image loading was aborted.', 'AbortError')
}

function isImageBitmap(input: StandardImageInput): input is ImageBitmap {
  return typeof ImageBitmap !== 'undefined' && input instanceof ImageBitmap
}

function loadImageElement(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    const cleanup = () => {
      signal.removeEventListener('abort', abort)
      image.onload = null
      image.onerror = null
    }
    const abort = () => {
      cleanup()
      image.src = ''
      reject(createAbortError())
    }
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('The source image could not be decoded.'))
    }
    signal.addEventListener('abort', abort, { once: true })
    image.src = url
  })
}

export function createStandardImageSource(
  input: StandardImageInput,
): ImageSource {
  let loadedImage: HTMLImageElement | null = null
  let ownedBitmap: ImageBitmap | null = null
  let bitmapPromise: Promise<ImageBitmap> | null = null
  let objectUrl: string | null = null
  let disposed = false

  return {
    id: globalThis.crypto.randomUUID(),
    async load(signal): Promise<LoadedImage> {
      if (disposed) {
        throw new Error('The image source has been disposed.')
      }
      if (signal.aborted) {
        throw createAbortError()
      }
      if (isImageBitmap(input)) {
        bitmapPromise ??= createImageBitmap(input)
        const bitmap = await bitmapPromise
        if (disposed || signal.aborted) {
          bitmap.close()
          bitmapPromise = null
          throw createAbortError()
        }
        ownedBitmap = bitmap
        return { source: bitmap, width: bitmap.width, height: bitmap.height }
      }
      if (loadedImage !== null) {
        return {
          source: loadedImage,
          width: loadedImage.naturalWidth,
          height: loadedImage.naturalHeight,
        }
      }

      if (typeof input !== 'string') {
        objectUrl = URL.createObjectURL(input)
      }
      const image = await loadImageElement(
        typeof input === 'string' ? input : objectUrl as string,
        signal,
      )
      if (disposed) {
        throw createAbortError()
      }
      loadedImage = image
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }
    },
    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      loadedImage = null
      ownedBitmap?.close()
      ownedBitmap = null
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    },
  }
}

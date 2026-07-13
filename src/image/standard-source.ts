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
      // 加载完成、失败或取消后都解除监听，避免旧图片对象长期持有闭包。
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
  // ImageBitmap 由本模块复制并持有，dispose 时负责 close；外部传入对象不在这里销毁。
  let sourceInput: StandardImageInput | null = input
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
      if (sourceInput !== null && isImageBitmap(sourceInput)) {
        const bitmapInput = sourceInput
        sourceInput = null
        bitmapPromise = createImageBitmap(bitmapInput).then(bitmap => {
          if (disposed) {
            bitmap.close()
            throw createAbortError()
          }
          ownedBitmap = bitmap
          return bitmap
        })
      }
      if (bitmapPromise !== null) {
        const bitmap = await bitmapPromise
        if (disposed || signal.aborted) {
          throw createAbortError()
        }
        return { source: bitmap, width: bitmap.width, height: bitmap.height }
      }
      if (loadedImage !== null) {
        return {
          source: loadedImage,
          width: loadedImage.naturalWidth,
          height: loadedImage.naturalHeight,
        }
      }

      if (sourceInput === null) {
        throw new Error('The image input is unavailable.')
      }
      if (typeof sourceInput !== 'string') {
        // Blob/File 先转成临时 URL，资源销毁时必须配对 revokeObjectURL。
        objectUrl = URL.createObjectURL(sourceInput)
      }
      const image = await loadImageElement(
        typeof sourceInput === 'string' ? sourceInput : objectUrl as string,
        signal,
      )
      if (disposed) {
        throw createAbortError()
      }
      loadedImage = image
      sourceInput = null
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
      sourceInput = null
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

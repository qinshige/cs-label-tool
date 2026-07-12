export function encodeBinaryMaskRle(mask: ArrayLike<number>): readonly number[] {
  const runs: number[] = []
  let expected = 0
  let length = 0
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ?? 0
    const bit = value > 0 ? 1 : 0
    if (bit === expected) {
      length += 1
    } else {
      runs.push(length)
      expected = bit
      length = 1
    }
  }
  runs.push(length)
  return Object.freeze(runs)
}

export function decodeBinaryMaskRle(
  rle: readonly number[],
  width: number,
  height: number,
): Uint8Array {
  const total = width * height
  const mask = new Uint8Array(total)
  let offset = 0
  let value = 0
  for (const run of rle) {
    const count = Math.max(0, Math.floor(run))
    if (value === 1) {
      mask.fill(1, offset, Math.min(total, offset + count))
    }
    offset += count
    value = value === 0 ? 1 : 0
    if (offset >= total) {
      break
    }
  }
  return mask
}

export function masksIntersect(
  first: ArrayLike<number>,
  second: ArrayLike<number>,
): boolean {
  const length = Math.min(first.length, second.length)
  for (let index = 0; index < length; index += 1) {
    if ((first[index] ?? 0) > 0 && (second[index] ?? 0) > 0) {
      return true
    }
  }
  return false
}

export function mergeBinaryMasks(
  first: ArrayLike<number>,
  second: ArrayLike<number>,
): Uint8Array {
  const length = Math.max(first.length, second.length)
  const merged = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) {
    merged[index] = (first[index] ?? 0) > 0 || (second[index] ?? 0) > 0
      ? 1
      : 0
  }
  return merged
}

export function subtractBinaryMask(
  source: ArrayLike<number>,
  eraser: ArrayLike<number>,
): Uint8Array {
  const length = source.length
  const result = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) {
    result[index] = (source[index] ?? 0) > 0 && (eraser[index] ?? 0) === 0
      ? 1
      : 0
  }
  return result
}

export function hasMaskPixels(mask: ArrayLike<number>): boolean {
  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) > 0) {
      return true
    }
  }
  return false
}

export function splitBinaryMaskComponents(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array[] {
  const normalizedWidth = Math.max(0, Math.floor(width))
  const normalizedHeight = Math.max(0, Math.floor(height))
  const length = normalizedWidth * normalizedHeight
  const visited = new Uint8Array(length)
  const queue = new Int32Array(length)
  const components: Uint8Array[] = []

  for (let start = 0; start < length; start += 1) {
    if (visited[start] === 1 || (mask[start] ?? 0) === 0) {
      continue
    }
    const component = new Uint8Array(length)
    let head = 0
    let tail = 0
    queue[tail] = start
    tail += 1
    visited[start] = 1

    while (head < tail) {
      const index = queue[head]
      head += 1
      if (index === undefined) {
        continue
      }
      component[index] = 1
      const x = index % normalizedWidth
      const y = Math.floor(index / normalizedWidth)
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue
          }
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (
            nextX < 0 ||
            nextY < 0 ||
            nextX >= normalizedWidth ||
            nextY >= normalizedHeight
          ) {
            continue
          }
          const next = nextY * normalizedWidth + nextX
          if (visited[next] === 1 || (mask[next] ?? 0) === 0) {
            continue
          }
          visited[next] = 1
          queue[tail] = next
          tail += 1
        }
      }
    }
    components.push(component)
  }

  return components
}

export function getBinaryMaskBounds(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Bounds | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((mask[y * width + x] ?? 0) === 0) {
        continue
      }
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    : null
}

export function translateBinaryMask(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  deltaX: number,
  deltaY: number,
): Uint8Array {
  const offsetX = Math.round(deltaX)
  const offsetY = Math.round(deltaY)
  const translated = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((mask[y * width + x] ?? 0) === 0) {
        continue
      }
      const nextX = x + offsetX
      const nextY = y + offsetY
      if (nextX >= 0 && nextY >= 0 && nextX < width && nextY < height) {
        translated[nextY * width + nextX] = 1
      }
    }
  }
  return translated
}

export function binaryMasksWithinDistance(
  first: ArrayLike<number>,
  second: ArrayLike<number>,
  width: number,
  height: number,
  distance: number,
): boolean {
  const radius = Math.max(0, Math.ceil(distance))
  const distanceSquared = distance * distance
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((first[y * width + x] ?? 0) === 0) {
        continue
      }
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          if (offsetX * offsetX + offsetY * offsetY > distanceSquared) {
            continue
          }
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (
            nextX >= 0 &&
            nextY >= 0 &&
            nextX < width &&
            nextY < height &&
            (second[nextY * width + nextX] ?? 0) > 0
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}
import type { Bounds } from '../geometry/types.js'

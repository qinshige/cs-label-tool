import type { Point } from './types.js'

function squaredDistanceToSegment(
  point: Point,
  start: Point,
  end: Point,
): number {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  if (deltaX === 0 && deltaY === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2
  }

  const ratio = Math.max(0, Math.min(1,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
      (deltaX ** 2 + deltaY ** 2),
  ))
  const nearestX = start.x + ratio * deltaX
  const nearestY = start.y + ratio * deltaY
  return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2
}

/** 使用 RDP 算法减少自由绘制产生的冗余点，同时保留轮廓的主要转折。 */
export function simplifyPath(
  points: readonly Point[],
  tolerance: number,
): Point[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError(
      'simplifyTolerance must be a finite non-negative number.',
    )
  }

  // 连续重复点会形成零长度线段，必须在简化前清理。
  const unique = points.filter((point, index) => {
    const previous = points[index - 1]
    return previous === undefined ||
      previous.x !== point.x ||
      previous.y !== point.y
  })
  if (unique.length <= 2 || tolerance === 0) {
    return unique.map(point => ({ ...point }))
  }

  const keptIndexes = new Set([0, unique.length - 1])
  const visit = (startIndex: number, endIndex: number): void => {
    const start = unique[startIndex]
    const end = unique[endIndex]
    if (start === undefined || end === undefined) {
      return
    }
    let farthestIndex = -1
    let farthestDistance = tolerance ** 2
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const point = unique[index]
      if (point === undefined) {
        continue
      }
      const distance = squaredDistanceToSegment(point, start, end)
      if (distance > farthestDistance) {
        farthestIndex = index
        farthestDistance = distance
      }
    }
    if (farthestIndex >= 0) {
      keptIndexes.add(farthestIndex)
      visit(startIndex, farthestIndex)
      visit(farthestIndex, endIndex)
    }
  }

  visit(0, unique.length - 1)
  return unique
    .filter((_point, index) => keptIndexes.has(index))
    .map(point => ({ ...point }))
}

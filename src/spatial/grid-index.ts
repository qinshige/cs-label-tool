import type { Bounds } from '../geometry/types.js'

export interface GridIndex {
  // 一个标注可能跨越多个网格；cells 用于召回候选，items 保存精确包围盒。
  readonly cellSize: number
  readonly cells: Map<string, Set<string>>
  readonly items: Map<string, Bounds>
  readonly order: Map<string, number>
  nextOrder: number
}

function assertBounds(bounds: Bounds): void {
  if (
    ![
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    ].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0
  ) {
    throw new RangeError('Spatial bounds must be finite and non-negative.')
  }
}

function getCellKeys(cellSize: number, bounds: Bounds): string[] {
  // 边界落在哪些网格中，插入、更新、删除和查询都使用同一套计算规则。
  const minX = Math.floor(bounds.x / cellSize)
  const minY = Math.floor(bounds.y / cellSize)
  const maxX = Math.floor((bounds.x + bounds.width) / cellSize)
  const maxY = Math.floor((bounds.y + bounds.height) / cellSize)
  const keys: string[] = []
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      keys.push(`${x}:${y}`)
    }
  }
  return keys
}

function removeFromCells(index: GridIndex, id: string): void {
  const bounds = index.items.get(id)
  if (bounds === undefined) {
    return
  }

  for (const key of getCellKeys(index.cellSize, bounds)) {
    const occupants = index.cells.get(key)
    if (occupants === undefined) {
      continue
    }
    occupants.delete(id)
    if (occupants.size === 0) {
      index.cells.delete(key)
    }
  }
}

function addToCells(
  cells: Map<string, Set<string>>,
  cellSize: number,
  id: string,
  bounds: Bounds,
): void {
  for (const key of getCellKeys(cellSize, bounds)) {
    const occupants = cells.get(key) ?? new Set<string>()
    occupants.add(id)
    cells.set(key, occupants)
  }
}

function intersects(first: Bounds, second: Bounds): boolean {
  return !(
    first.x + first.width < second.x ||
    second.x + second.width < first.x ||
    first.y + first.height < second.y ||
    second.y + second.height < first.y
  )
}

export function createGridIndex(cellSize: number): GridIndex {
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new RangeError('Spatial cell size must be finite and positive.')
  }
  return {
    cellSize,
    cells: new Map(),
    items: new Map(),
    order: new Map(),
    nextOrder: 0,
  }
}

export function insertSpatialItem(
  index: GridIndex,
  id: string,
  bounds: Bounds,
): GridIndex {
  assertBounds(bounds)
  if (index.items.has(id)) {
    return updateSpatialItem(index, id, bounds)
  }

  addToCells(index.cells, index.cellSize, id, bounds)
  index.items.set(id, { ...bounds })
  // order 记录插入顺序，查询结果据此保持稳定，也对应画布上的绘制层级。
  index.order.set(id, index.nextOrder)
  index.nextOrder += 1
  return index
}

export function updateSpatialItem(
  index: GridIndex,
  id: string,
  bounds: Bounds,
): GridIndex {
  assertBounds(bounds)
  if (!index.items.has(id)) {
    return insertSpatialItem(index, id, bounds)
  }

  removeFromCells(index, id)
  addToCells(index.cells, index.cellSize, id, bounds)
  index.items.set(id, { ...bounds })
  return index
}

export function removeSpatialItem(index: GridIndex, id: string): GridIndex {
  if (!index.items.has(id)) {
    return index
  }
  removeFromCells(index, id)
  index.items.delete(id)
  index.order.delete(id)
  return index
}

export function restoreSpatialItem(
  index: GridIndex,
  id: string,
  bounds: Bounds,
  order: number,
): GridIndex {
  insertSpatialItem(index, id, bounds)
  index.order.set(id, order)
  return index
}

export function querySpatialBounds(
  index: GridIndex,
  bounds: Bounds,
): string[] {
  assertBounds(bounds)
  const candidates = new Set<string>()
  // 网格查询是粗筛：先合并所有相关单元格，再用真实包围盒剔除误命中。
  for (const key of getCellKeys(index.cellSize, bounds)) {
    for (const id of index.cells.get(key) ?? []) {
      candidates.add(id)
    }
  }

  return [...candidates]
    .filter(id => {
      const item = index.items.get(id)
      return item !== undefined && intersects(item, bounds)
    })
    .sort((first, second) =>
      (index.order.get(first) ?? 0) - (index.order.get(second) ?? 0),
    )
}

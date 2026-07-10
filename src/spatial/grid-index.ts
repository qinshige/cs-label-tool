import type { Bounds } from '../geometry/types.js'

export interface GridIndex {
  readonly cellSize: number
  readonly cells: ReadonlyMap<string, ReadonlySet<string>>
  readonly items: ReadonlyMap<string, Bounds>
  readonly order: ReadonlyMap<string, number>
  readonly nextOrder: number
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

function withoutItem(
  index: GridIndex,
  id: string,
): Map<string, ReadonlySet<string>> {
  const cells = new Map(index.cells)
  const bounds = index.items.get(id)
  if (bounds === undefined) {
    return cells
  }

  for (const key of getCellKeys(index.cellSize, bounds)) {
    const occupants = new Set(cells.get(key))
    occupants.delete(id)
    if (occupants.size === 0) {
      cells.delete(key)
    } else {
      cells.set(key, occupants)
    }
  }
  return cells
}

function addToCells(
  cells: Map<string, ReadonlySet<string>>,
  cellSize: number,
  id: string,
  bounds: Bounds,
): void {
  for (const key of getCellKeys(cellSize, bounds)) {
    const occupants = new Set(cells.get(key))
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

  const cells = new Map(index.cells)
  addToCells(cells, index.cellSize, id, bounds)
  const items = new Map(index.items)
  items.set(id, bounds)
  const order = new Map(index.order)
  order.set(id, index.nextOrder)
  return {
    ...index,
    cells,
    items,
    order,
    nextOrder: index.nextOrder + 1,
  }
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

  const cells = withoutItem(index, id)
  addToCells(cells, index.cellSize, id, bounds)
  const items = new Map(index.items)
  items.set(id, bounds)
  return { ...index, cells, items }
}

export function removeSpatialItem(index: GridIndex, id: string): GridIndex {
  if (!index.items.has(id)) {
    return index
  }
  const cells = withoutItem(index, id)
  const items = new Map(index.items)
  const order = new Map(index.order)
  items.delete(id)
  order.delete(id)
  return { ...index, cells, items, order }
}

export function querySpatialBounds(
  index: GridIndex,
  bounds: Bounds,
): string[] {
  assertBounds(bounds)
  const candidates = new Set<string>()
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

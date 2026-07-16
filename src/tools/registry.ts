import type { Tool, ToolRegistry } from './types.js'
import { createBrushTool } from './brush-tool.js'
import { createEraserTool } from './eraser-tool.js'
import { createEllipseTool } from './ellipse-tool.js'
import { createFreehandTool } from './freehand-tool.js'
import { createPointTool } from './point-tool.js'
import { createLassoTool } from './lasso-tool.js'
import { createPolygonTool } from './polygon-tool.js'
import { createPolylineTool } from './polyline-tool.js'
import { createRectTool } from './rect-tool.js'
import { createSelectTool } from './select-tool.js'

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>()

  return {
    register(tool): void {
      tools.set(tool.id, tool)
    },

    unregister(toolId): void {
      tools.delete(toolId)
    },

    get(toolId): Tool | undefined {
      return tools.get(toolId)
    },

    list(): readonly Tool[] {
      return [...tools.values()]
    },

    listByCategory(category): readonly Tool[] {
      return [...tools.values()].filter(tool => tool.category === category)
    },
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = createToolRegistry()
  registry.register(createSelectTool())
  registry.register(createLassoTool())
  registry.register(createFreehandTool())
  registry.register(createPointTool())
  registry.register(createRectTool({}))
  registry.register(createEllipseTool())
  registry.register(createPolylineTool())
  registry.register(createPolygonTool({}))
  registry.register(createBrushTool({}))
  registry.register(createEraserTool())
  return registry
}

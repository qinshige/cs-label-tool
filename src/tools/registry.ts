import type { Tool, ToolCategory, ToolRegistry } from './types.js'
import { createBrushTool } from './brush-tool.js'
import { createEraserTool } from './eraser-tool.js'
import { createPolygonTool } from './polygon-tool.js'
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
  registry.register(createRectTool({}))
  registry.register(createPolygonTool({}))
  registry.register(createBrushTool({}))
  registry.register(createEraserTool())
  return registry
}

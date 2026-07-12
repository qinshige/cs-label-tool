import { getInternalState } from '../core/annotator.js'
import type { Annotator } from '../core/types.js'
import type { Tool, ToolCategory } from './types.js'

export { createDefaultToolRegistry, createToolRegistry } from './registry.js'

export {
  activateTool,
  activateToolById,
  cancelActiveGesture,
  getRegisteredTools,
  getRegisteredToolsByCategory,
} from './controller.js'

export function registerTool(annotator: Annotator, tool: Tool): void {
  getInternalState(annotator).toolRegistry.register(tool)
}

export function unregisterTool(annotator: Annotator, toolId: string): void {
  getInternalState(annotator).toolRegistry.unregister(toolId)
}

export function getTool(annotator: Annotator, toolId: string): Tool | undefined {
  return getInternalState(annotator).toolRegistry.get(toolId)
}

export function listTools(annotator: Annotator): readonly Tool[] {
  return getInternalState(annotator).toolRegistry.list()
}

export function listToolsByCategory(
  annotator: Annotator,
  category: ToolCategory,
): readonly Tool[] {
  return getInternalState(annotator).toolRegistry.listByCategory(category)
}

import { describe, expect, test } from 'vitest'

import {
  create,
  createToolApi,
  getActiveToolId,
} from '../../src/index.js'
import { getInternalState } from '../../src/core/annotator.js'

describe('instance API', () => {
  test('exposes mask and built-in canvas tool helpers', () => {
    const editor = create({ container: {} as HTMLElement })

    editor.addLabel({ id: 'person', name: 'Person', color: '#ff4d4f' })
    const maskId = editor.addMask({
      labelId: 'person',
      width: 4,
      height: 4,
      rle: [16],
    })

    expect(editor.snapshot().annotations[0]?.id).toBe(maskId)
    expect(editor.snapshot().annotations[0]?.geometry).toEqual({
      type: 'mask',
      width: 4,
      height: 4,
      rle: [16],
    })
    expect(typeof editor.useBrush).toBe('function')
    expect(typeof editor.useEraser).toBe('function')
  })

  test('exposes one bound API for all built-in tools and selection actions', () => {
    const editor = create({ container: {} as HTMLElement })
    editor.addLabel({ id: 'person', name: 'Person', color: '#ff4d4f' })
    editor.addLabel({ id: 'vehicle', name: 'Vehicle', color: '#1677ff' })
    editor.setActiveLabel('person')
    const activated: string[] = []
    const internal = getInternalState(editor.annotator)
    internal.renderer = {
      eventCanvas: {} as HTMLCanvasElement,
      invalidate() {},
      resize() {},
      destroy() {},
    }
    internal.toolController = {
      activate(tool) {
        activated.push(tool.id)
        internal.activeToolId = tool.id
      },
      activateById() {},
      cancel() {},
      destroy() {},
    }

    editor.tools.select()
    editor.tools.rect({ minimumSize: 4 })
    editor.tools.polygon()
    editor.tools.brush({ size: 24 })
    editor.tools.eraser({ size: 18 })

    expect(activated).toEqual(['select', 'rect', 'polygon', 'brush', 'eraser'])
    expect(editor.tools.activeId()).toBe('eraser')
    expect(getActiveToolId(editor.annotator)).toBe('eraser')

    const rectId = editor.addRect({
      labelId: 'person',
      x: 1,
      y: 1,
      width: 10,
      height: 10,
    })
    editor.tools.selectAnnotation(rectId)
    expect(editor.tools.selection()).toEqual([rectId])
    expect(editor.tools.setSelectionLabel('vehicle')).toBe(1)
    expect(editor.snapshot().annotations[0]?.labelId).toBe('vehicle')
    expect(editor.tools.deleteSelection()).toBe(1)
    expect(editor.snapshot().annotations).toHaveLength(0)
  })

  test('creates the same bound tool API for function-style consumers', () => {
    const editor = create({ container: {} as HTMLElement })
    const tools = createToolApi(editor.annotator)

    expect(tools.list().map(tool => tool.id)).toEqual([
      'select',
      'rect',
      'polygon',
      'brush',
      'eraser',
    ])
    const customTool = {
      id: 'custom',
      name: 'Custom',
      cursor: 'default',
      category: 'utility' as const,
      handle() {},
      cancel() {},
    }
    tools.register(customTool)
    expect(tools.listByCategory('utility').map(tool => tool.id)).toEqual([
      'custom',
    ])
    tools.unregister('custom')
    expect(tools.get('custom')).toBeUndefined()
    expect(tools.activeId()).toBeNull()
  })
})

import { describe, expect, test } from 'vitest'

import {
  createAnnotator,
  createDefaultToolRegistry,
  getRegisteredTools,
  listTools,
} from '../../src/index.js'

describe('default tool registration', () => {
  test('new annotators expose the built-in canvas tools', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })

    expect(getRegisteredTools(annotator).map(tool => tool.id)).toEqual([
      'select',
      'rect',
      'polygon',
      'brush',
      'eraser',
    ])
    expect(listTools(annotator).map(tool => tool.id)).toEqual([
      'select',
      'rect',
      'polygon',
      'brush',
      'eraser',
    ])
  })

  test('creates independent default registries', () => {
    const first = createDefaultToolRegistry()
    const second = createDefaultToolRegistry()

    first.unregister('brush')

    expect(first.list().map(tool => tool.id)).toEqual([
      'select',
      'rect',
      'polygon',
      'eraser',
    ])
    expect(second.list().map(tool => tool.id)).toEqual([
      'select',
      'rect',
      'polygon',
      'brush',
      'eraser',
    ])
  })
})

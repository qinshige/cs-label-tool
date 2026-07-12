import { describe, expect, test } from 'vitest'

import { create } from '../../src/index.js'

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
})

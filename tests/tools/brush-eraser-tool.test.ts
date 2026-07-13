import { describe, expect, test } from 'vitest'

import {
  addLabel,
  addMask,
  addRect,
  createAnnotator,
  createBrushTool,
  createBrushMaskGeometry,
  createEraserTool,
  createSelectTool,
  getSelection,
  getSnapshot,
  removeAnnotation,
  type ToolContext,
  type InteractionDraft,
  type Tool,
} from '../../src/index.js'
import { getInternalState } from '../../src/core/annotator.js'
import {
  decodeBinaryMaskRle,
  getBinaryMaskBounds,
} from '../../src/mask/rle.js'

function noopContext(annotator: ReturnType<typeof createAnnotator>): ToolContext {
  return {
    annotator,
    setDraft() {},
    clearDraft() {},
  }
}

function recordingContext(annotator: ReturnType<typeof createAnnotator>): {
  readonly context: ToolContext
  readonly drafts: InteractionDraft[]
} {
  const drafts: InteractionDraft[] = []
  return {
    drafts,
    context: {
      annotator,
      setDraft(draft) {
        drafts.push(draft)
      },
      clearDraft() {},
    },
  }
}

function setLoadedImage(
  annotator: ReturnType<typeof createAnnotator>,
  width: number,
  height: number,
): void {
  getInternalState(annotator).image = {
    width,
    height,
    source: {} as CanvasImageSource,
  }
}

function drawStroke(
  tool: Tool,
  context: ToolContext,
  points: readonly { x: number, y: number }[],
): void {
  const first = points[0]
  const last = points[points.length - 1]
  if (first === undefined || last === undefined) {
    return
  }
  tool.handle({
    type: 'down',
    pointerId: 1,
    imagePoint: first,
    buttons: 1,
    pressure: 0.5,
    detail: 1,
  }, context)
  for (const point of points.slice(1, -1)) {
    tool.handle({
      type: 'move',
      pointerId: 1,
      imagePoint: point,
      buttons: 1,
      pressure: 0.5,
      detail: 1,
    }, context)
  }
  tool.handle({
    type: 'up',
    pointerId: 1,
    imagePoint: last,
    buttons: 0,
    pressure: 0,
    detail: 1,
  }, context)
}

function maskPixelCount(annotation: ReturnType<typeof getSnapshot>['annotations'][number]): number {
  if (annotation.geometry.type !== 'mask') {
    return 0
  }
  return decodeBinaryMaskRle(
    annotation.geometry.rle,
    annotation.geometry.width,
    annotation.geometry.height,
  ).reduce((count, bit) => count + bit, 0)
}

describe('brush and eraser tools', () => {
  test('calculates label bounds from actual mask pixels', () => {
    const mask = new Uint8Array(12 * 10)
    mask[3 * 12 + 4] = 1
    mask[7 * 12 + 9] = 1

    expect(getBinaryMaskBounds(mask, 12, 10)).toEqual({
      x: 4,
      y: 3,
      width: 6,
      height: 5,
    })
  })

  test('creates persistent mask geometry from a brush stroke', () => {
    const geometry = createBrushMaskGeometry({
      imageWidth: 16,
      imageHeight: 16,
      brushSize: 5,
      points: [{ x: 4, y: 4 }, { x: 10, y: 4 }],
    })

    expect(geometry).toMatchObject({
      type: 'mask',
      width: 16,
      height: 16,
    })
    expect(geometry.rle.some(run => run > 0)).toBe(true)
  })

  test('merges overlapping brush strokes with the same label into one mask', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const brush = createBrushTool({ labelId: 'person', size: 6 })
    const context = noopContext(annotator)

    drawStroke(brush, context, [{ x: 8, y: 8 }, { x: 16, y: 8 }])
    const firstSnapshot = getSnapshot(annotator)
    const firstCount = maskPixelCount(firstSnapshot.annotations[0]!)

    drawStroke(brush, context, [{ x: 14, y: 8 }, { x: 22, y: 8 }])

    const annotations = getSnapshot(annotator).annotations
    expect(annotations).toHaveLength(1)
    expect(annotations[0]?.geometry.type).toBe('mask')
    expect(maskPixelCount(annotations[0]!)).toBeGreaterThan(firstCount)
  })

  test('ignores hover and pointer-up events until a brush stroke starts', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const brush = createBrushTool({ labelId: 'person', size: 12 })

    brush.handle({
      type: 'move',
      pointerId: 1,
      imagePoint: { x: 8, y: 8 },
      buttons: 0,
      pressure: 0,
      detail: 0,
    }, noopContext(annotator))
    brush.handle({
      type: 'up',
      pointerId: 1,
      imagePoint: { x: 18, y: 8 },
      buttons: 0,
      pressure: 0,
      detail: 0,
    }, noopContext(annotator))

    expect(getSnapshot(annotator).annotations).toHaveLength(0)
  })

  test('publishes a brush draft with the configured size while dragging', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const brush = createBrushTool({ labelId: 'person', size: 18 })
    const { context, drafts } = recordingContext(annotator)

    brush.handle({
      type: 'down',
      pointerId: 7,
      imagePoint: { x: 8, y: 8 },
      buttons: 1,
      pressure: 0.5,
      detail: 1,
    }, context)
    brush.handle({
      type: 'move',
      pointerId: 7,
      imagePoint: { x: 16, y: 8 },
      buttons: 1,
      pressure: 0.5,
      detail: 1,
    }, context)

    expect(drafts.at(-1)).toMatchObject({
      type: 'brush',
      size: 18,
      color: '#ff4d4f',
      labelId: 'person',
      points: [{ x: 8, y: 8 }, { x: 16, y: 8 }],
    })
  })

  test('eraser subtracts from masks without deleting rectangle annotations', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const maskGeometry = createBrushMaskGeometry({
      imageWidth: 32,
      imageHeight: 32,
      brushSize: 8,
      points: [{ x: 8, y: 16 }, { x: 24, y: 16 }],
    })
    addMask(annotator, {
      labelId: 'person',
      width: maskGeometry.width,
      height: maskGeometry.height,
      rle: maskGeometry.rle,
    })
    addRect(annotator, {
      labelId: 'person',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    })
    const eraser = createEraserTool({ size: 8 })
    const before = getSnapshot(annotator).annotations
    const beforeCount = maskPixelCount(before[0]!)

    drawStroke(eraser, noopContext(annotator), [
      { x: 16, y: 16 },
      { x: 20, y: 16 },
    ])

    const annotations = getSnapshot(annotator).annotations
    const masks = annotations.filter(annotation => annotation.geometry.type === 'mask')
    expect(masks).toHaveLength(2)
    expect(annotations.filter(annotation => annotation.geometry.type === 'rect'))
      .toHaveLength(1)
    expect(masks.reduce((total, mask) => total + maskPixelCount(mask), 0))
      .toBeLessThan(beforeCount)
  })

  test('ignores eraser hover and pointer-up events until erasing starts', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const geometry = createBrushMaskGeometry({
      imageWidth: 32,
      imageHeight: 32,
      brushSize: 12,
      points: [{ x: 8, y: 8 }, { x: 22, y: 8 }],
    })
    addMask(annotator, { labelId: 'person', ...geometry })
    const before = maskPixelCount(getSnapshot(annotator).annotations[0]!)
    const eraser = createEraserTool({ size: 12 })
    const context = noopContext(annotator)

    eraser.handle({
      type: 'move',
      pointerId: 1,
      imagePoint: { x: 10, y: 8 },
      buttons: 0,
      pressure: 0,
      detail: 0,
    }, context)
    eraser.handle({
      type: 'up',
      pointerId: 1,
      imagePoint: { x: 18, y: 8 },
      buttons: 0,
      pressure: 0,
      detail: 0,
    }, context)

    expect(maskPixelCount(getSnapshot(annotator).annotations[0]!)).toBe(before)
  })

  test('publishes an eraser draft continuously while the pointer is held', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 32, 32)
    const eraser = createEraserTool({ size: 14 })
    const { context, drafts } = recordingContext(annotator)

    eraser.handle({
      type: 'down',
      pointerId: 3,
      imagePoint: { x: 8, y: 8 },
      buttons: 1,
      pressure: 0.5,
      detail: 1,
    }, context)
    eraser.handle({
      type: 'move',
      pointerId: 3,
      imagePoint: { x: 18, y: 8 },
      buttons: 1,
      pressure: 0.5,
      detail: 1,
    }, context)

    expect(drafts).toHaveLength(2)
    expect(drafts.at(-1)).toMatchObject({
      type: 'eraser',
      size: 14,
      points: [{ x: 8, y: 8 }, { x: 18, y: 8 }],
    })
  })

  test('splits an erased mask into independently selectable and deletable components', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 40, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const geometry = createBrushMaskGeometry({
      imageWidth: 40,
      imageHeight: 32,
      brushSize: 8,
      points: [{ x: 6, y: 16 }, { x: 34, y: 16 }],
    })
    addMask(annotator, { labelId: 'person', ...geometry })

    drawStroke(createEraserTool({ size: 6 }), noopContext(annotator), [
      { x: 20, y: 8 },
      { x: 20, y: 24 },
    ])

    const components = getSnapshot(annotator).annotations
    expect(components).toHaveLength(2)
    expect(components.every(item => item.geometry.type === 'mask')).toBe(true)

    const select = createSelectTool()
    drawStroke(select, noopContext(annotator), [
      { x: 10, y: 16 },
      { x: 10, y: 16 },
    ])
    const leftId = getSelection(annotator)[0]
    expect(leftId).toBeDefined()

    drawStroke(select, noopContext(annotator), [
      { x: 30, y: 16 },
      { x: 30, y: 16 },
    ])
    const rightId = getSelection(annotator)[0]
    expect(rightId).toBeDefined()
    expect(rightId).not.toBe(leftId)

    expect(removeAnnotation(annotator, rightId!)).toBe(true)
    expect(getSnapshot(annotator).annotations).toHaveLength(1)
  })

  test('drags a mask and merges it with a nearby mask of the same label', () => {
    const annotator = createAnnotator({ container: {} as HTMLElement })
    setLoadedImage(annotator, 48, 32)
    addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
    const left = createBrushMaskGeometry({
      imageWidth: 48,
      imageHeight: 32,
      brushSize: 6,
      points: [{ x: 8, y: 16 }],
    })
    const right = createBrushMaskGeometry({
      imageWidth: 48,
      imageHeight: 32,
      brushSize: 6,
      points: [{ x: 28, y: 16 }],
    })
    addMask(annotator, { labelId: 'person', ...left })
    addMask(annotator, { labelId: 'person', ...right })

    drawStroke(createSelectTool(), noopContext(annotator), [
      { x: 8, y: 16 },
      { x: 21, y: 16 },
    ])

    const annotations = getSnapshot(annotator).annotations
    expect(annotations).toHaveLength(1)
    expect(annotations[0]?.geometry.type).toBe('mask')
    expect(maskPixelCount(annotations[0]!)).toBeGreaterThan(
      maskPixelCount({ geometry: left } as typeof annotations[number]),
    )
  })
})

# cs-label-tool

Online Demo: <https://qinshige.github.io/cs-label-tool/>

A TypeScript library for image annotation using Canvas. Zero runtime dependencies. Use it as standalone functions or via the pre-bound `editor` instance.

Currently supported:

- Image loading via URL, `Blob`, `ImageBitmap`.
- Select, box-select, lasso-select, freehand, point, rect, ellipse, polyline, polygon, brush, and eraser tools.
- Move, rotate, and 8-direction resize for rects and ellipses; vertex editing for polylines and polygons.
- Multi-select, layer ordering, lock, hide, copy/paste, clone, group, and ungroup.
- Single-choice image-level classification; classification results go into snapshots alongside Canvas annotations.
- Mask click-select, drag, delete, re-label, and proximity merging.
- Brush stroke overlap merging; eraser with real-time transparent preview and connected-component splitting.
- Zoom, pan, fit-to-screen, coordinate transforms, and DPR-aware HiDPI rendering.
- Label management, spatial queries, undo/redo, event subscriptions, and custom tools.

## Environment & Installation

- Chrome, Edge, Firefox – last two major versions
- Safari 17+
- ESM only

```bash
npm install cs-label-tool
```

The container must have computable dimensions:

```html
<div id="annotator" style="width: 100%; height: 600px"></div>
```

## Quick Start

The bound instance is recommended. Instance methods don't require passing `annotator` repeatedly:

```ts
import { mount, createStandardImageSource } from 'cs-label-tool'

const editor = mount('#annotator', { historyLimit: 100 })

editor.addLabel({ id: 'person', name: 'Person', color: '#ff4d4f' })
editor.addLabel({ id: 'vehicle', name: 'Vehicle', color: '#1677ff' })
editor.setActiveLabel('person')

await editor.setImage(createStandardImageSource('/images/example.webp'))
editor.fitToScreen()
editor.tools.rect()
```

Complete page example:

```html
<div id="toolbar">
  <button id="select">Select</button>
  <button id="freehand">Freehand</button>
  <button id="point">Point</button>
  <button id="rect">Rect</button>
  <button id="ellipse">Ellipse</button>
  <button id="polyline">Polyline</button>
  <button id="polygon">Polygon</button>
  <button id="brush">Brush</button>
  <button id="eraser">Eraser</button>
  <button id="delete">Delete Selected</button>
</div>
<div id="annotator" style="width: 100%; height: 600px"></div>
```

```ts
import {
  mount,
  createStandardImageSource,
  type AnnotationSnapshot,
} from 'cs-label-tool'

const editor = mount('#annotator', { historyLimit: 100 })

editor.addLabel({ id: 'person', name: 'Person', color: '#ff4d4f' })
editor.addLabel({ id: 'vehicle', name: 'Vehicle', color: '#1677ff' })
editor.setActiveLabel('person')

await editor.setImage(createStandardImageSource('/a.webp'))
editor.fitToScreen()

document.querySelector('#select')?.addEventListener('click', () => {
  editor.tools.select()
})

document.querySelector('#freehand')?.addEventListener('click', () => {
  editor.tools.freehand({ simplifyTolerance: 1.5 })
})
document.querySelector('#point')?.addEventListener('click', () => editor.tools.point())

document.querySelector('#rect')?.addEventListener('click', () => {
  editor.tools.rect({ minimumSize: 3 })
})

document.querySelector('#ellipse')?.addEventListener('click', () => {
  editor.tools.ellipse({ minimumRadius: 2 })
})

document.querySelector('#polyline')?.addEventListener('click', () => {
  editor.tools.polyline()
})

document.querySelector('#polygon')?.addEventListener('click', () => {
  editor.tools.polygon()
})

document.querySelector('#brush')?.addEventListener('click', () => {
  editor.tools.brush({ size: 24 })
})

document.querySelector('#eraser')?.addEventListener('click', () => {
  editor.tools.eraser({ size: 18 })
})

document.querySelector('#delete')?.addEventListener('click', () => {
  editor.tools.deleteSelection()
})

const unsubscribe = editor.subscribe('change', () => {
  const snapshot: AnnotationSnapshot = editor.snapshot()
  console.log(snapshot.annotations)
})

window.addEventListener('beforeunload', () => {
  unsubscribe()
  editor.destroy()
}, { once: true })
```

## Unified Tool API

### Instance Calls

`editor.tools` wraps all built-in interaction tools and common selection operations:

```ts
editor.tools.select()
editor.tools.lasso()
editor.tools.freehand({ simplifyTolerance: 1.5 })
editor.tools.point()
editor.tools.rect()
editor.tools.ellipse()
editor.tools.polyline()
editor.tools.polygon()
editor.tools.brush({ size: 24 })
editor.tools.eraser({ size: 18 })

const activeToolId = editor.tools.activeId()
const tools = editor.tools.list()
const brush = editor.tools.get('brush')

editor.tools.cancel()
```

### Functional Calls

When you already have a raw `Annotator`, create a bound tools object once:

```ts
import {
  createAnnotator,
  createToolApi,
  createStandardImageSource,
  setImageSource,
  addLabel,
  setActiveLabel,
} from 'cs-label-tool'

const annotator = createAnnotator({
  container: document.querySelector('#annotator')!,
  historyLimit: 100,
})

addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
setActiveLabel(annotator, 'person')
await setImageSource(annotator, createStandardImageSource('/a.webp'))

const tools = createToolApi(annotator)
tools.freehand({ labelId: 'person', simplifyTolerance: 2 })
tools.brush({ size: 20 })
```

You can also call the raw functions directly:

```ts
import {
  useSelect,
  useLasso,
  useFreehand,
  usePoint,
  useRect,
  useEllipse,
  usePolyline,
  usePolygon,
  useBrush,
  useEraser,
} from 'cs-label-tool'

useSelect(annotator)
useLasso(annotator)
useFreehand(annotator, { labelId: 'person', simplifyTolerance: 1.5 })
usePoint(annotator, { labelId: 'person' })
useRect(annotator, { labelId: 'person', minimumSize: 3 })
useEllipse(annotator, { labelId: 'person', minimumRadius: 2 })
usePolyline(annotator, { labelId: 'person' })
usePolygon(annotator, { labelId: 'person' })
useBrush(annotator, { labelId: 'person', size: 24, color: '#ff4d4f' })
useEraser(annotator, { size: 18 })
```

### Tool Parameters

| Tool     | Method              | Parameters                       |
| -------- | ------------------- | -------------------------------- |
| Select   | `select()`          | None                             |
| Lasso    | `lasso()`           | None                             |
| Freehand | `freehand(options)` | `labelId?`, `simplifyTolerance?` |
| Point    | `point(options)`    | `labelId?`                       |
| Rect     | `rect(options)`     | `labelId?`, `minimumSize?`       |
| Ellipse  | `ellipse(options)`  | `labelId?`, `minimumRadius?`     |
| Polyline | `polyline(options)` | `labelId?`                       |
| Polygon  | `polygon(options)`  | `labelId?`                       |
| Brush    | `brush(options)`    | `labelId?`, `size?`, `color?`    |
| Eraser   | `eraser(options)`   | `size?`                          |

When `labelId` is omitted, point, rect, ellipse, polyline, polygon, freehand, and brush tools use the currently active label. An image must be loaded and a label activated before using drawing tools.

### Tool Behaviors

- **Point**: Click to place an independent point; select and drag to reposition.
- **Rect**: Press-drag to draw; release to finish. After selection, move, rotate, and drag eight handle points to resize.
- **Ellipse**: Press-drag to draw; release to finish. Hold `Shift` for a perfect circle. Editing after selection is the same as rect.
- **Polyline**: Click point by point; press `Enter` or double-click to finish. Double-click a segment to insert a vertex; `Backspace` deletes the selected vertex.
- **Polygon**: Click point by point; press `Enter` or double-click to finish; `Backspace` removes the last point.
- **Freehand**: Hold mouse to draw continuously; the path auto-closes on release, producing a labeled `PolygonAnnotation`.
- **Brush**: Press-drag to paint; release to save. Overlapping masks with the same label auto-merge.
- **Eraser**: Press-drag to erase in real-time with transparency preview; committed on release. Only affects masks.
- **Mask Split**: When the eraser cuts a mask into disconnected regions, each connected component becomes an independent annotation.
- **Mask Merge**: After selecting a mask, when dragged near another mask of the same label (within \~8 screen pixels), they auto-merge.
- **Select**: Drag on empty space for box selection; `Shift + click` to add or remove from selection. Grouped annotations are selected as a whole by default; `Alt + click` selects only the current member.
- **Viewport Navigation**: Hold Space or middle-click to pan the canvas; scroll wheel zooms centered on the cursor.

The image layer, annotation layer, and interaction layer share the same viewport transform. Rects, polygons, labels, and handles re-render at the current DPR. Masks disable interpolation when zoomed in to keep pixel boundaries sharp. The source bitmap is still limited by the original image resolution and cannot scale infinitely like true SVG.

## How to Use Each Tool

The following examples continue from the `editor` instance in Quick Start. Load an image and add labels first, then activate tools.

### 1. Select Tool

The select tool does not create annotations. It's used to click, drag, zoom, re-label, and delete existing annotations.

```ts
// Activate the select tool, then click annotations on the canvas
editor.tools.select()

// Programmatically select an annotation by ID
editor.tools.selectAnnotation(annotationId)

// View current selection
const selectedIds = editor.tools.selection()

// Change the label of selected annotations; returns count changed
const changedCount = editor.tools.setSelectionLabel('vehicle')

// Delete selected annotations; returns count deleted
const deletedCount = editor.tools.deleteSelection()

// Deselect only, no data deletion
editor.tools.clearSelection()
```

A common delete button on a page:

```ts
document.querySelector('#delete')?.addEventListener('click', () => {
  const count = editor.tools.deleteSelection()
  console.log(`Deleted ${count} annotations`)
})
```

Functional style:

```ts
import {
  useSelect,
  selectAnnotation,
  getSelection,
  clearSelection,
  updateSelectedAnnotationsLabel,
  deleteSelectedAnnotations,
} from 'cs-label-tool'

useSelect(annotator)
selectAnnotation(annotator, annotationId)
updateSelectedAnnotationsLabel(annotator, 'vehicle')
deleteSelectedAnnotations(annotator)
clearSelection(annotator)
console.log(getSelection(annotator))
```

### 2. Rect Tool

Press-drag on the image to draw a rectangle; release to create it.

```ts
editor.tools.rect({
  labelId: 'person', // Uses active label if omitted
  minimumSize: 3,    // Rectangles smaller than 3 original-image pixels are not saved
})
```

Add a rect programmatically:

```ts
const rectId = editor.addRect({
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
  rotation: 25, // Optional, clockwise degrees; defaults to 0
})
```

Edit a rect:

```ts
// Select first. Users can also switch to the select tool and click the rect
editor.tools.selectAnnotation(rectId)
editor.tools.select()

// Directly modify position, size, and angle
editor.updateAnnotation(rectId, {
  type: 'rect',
  x: 120,
  y: 90,
  width: 320,
  height: 480,
  rotation: 45,
})

// Delete
editor.removeAnnotation(rectId)
```

With the select tool, drag inside the rect to move it; drag the eight square handles to resize. The circular handle above the top-center is for rotation. Rotated rects resize in their own orientation and do not degenerate into plain polygons.

`rotation` is in degrees, positive means clockwise. The API normalizes angles to `0–360` (e.g., `450` is stored as `90`). Old data without `rotation` is treated as a regular rect.

### 3. Polygon Tool

Click point by point after activation. Press `Enter` or double-click to finish, `Backspace` to remove the last point, `Escape` to cancel.

```ts
editor.tools.polygon({ labelId: 'person' })
```

Add by code using `{ x, y }`:

```ts
const polygonId = editor.addPolygon({
  labelId: 'person',
  points: [
    { x: 20, y: 20 },
    { x: 120, y: 20 },
    { x: 80, y: 140 },
  ],
})
```

Move vertices, delete vertices, and save changes:

```ts
import { movePolygonVertex, removePolygonVertex } from 'cs-label-tool'

const polygon = editor.snapshot().annotations.find(item => item.id === polygonId)

if (polygon?.geometry.type === 'polygon') {
  const moved = movePolygonVertex(
    polygon.geometry,
    0,
    { x: 30, y: 35 },
  )
  editor.updateAnnotation(polygonId, moved)

  // Polygons must have at least 3 valid vertices. Returns null if deletion is not possible
  const withoutSecondPoint = removePolygonVertex(moved, 1)
  if (withoutSecondPoint !== null) {
    editor.updateAnnotation(polygonId, withoutSecondPoint)
  }
}

editor.removeAnnotation(polygonId)
```

Snapshot `PolygonGeometry.points` are `[x, y]` tuples; `addPolygon()` input is `{ x, y }`. Don't mix the two formats.

### 3.1 Freehand Tool

Freehand is ideal for quickly outlining irregular targets. Hold mouse to start drawing, move to record the contour, release to auto-close. The result is still a standard `PolygonAnnotation` – not a lasso selection, and no special data format.

Using the active label:

```ts
editor.setActiveLabel('person')
editor.tools.freehand()
```

Specify label and path simplification tolerance:

```ts
editor.tools.freehand({
  labelId: 'person',
  // Units in original-image pixels. Higher values produce fewer vertices
  simplifyTolerance: 2,
})
```

Functional style:

```ts
import { useFreehand } from 'cs-label-tool'

useFreehand(annotator, {
  labelId: 'person',
  simplifyTolerance: 2,
})
```

Interactive drawing doesn't synchronously return IDs. Track newly created freehand annotations via `change` events, then edit them with business buttons. Once selected, moving, vertex editing, re-labeling, copying, and deleting work the same as regular polygons:

```ts
let latestFreehandId: string | null = null

const stopTracking = editor.subscribe('change', event => {
  if (event.kind !== 'annotation:add') return

  const annotation = editor.snapshot().annotations.at(-1)
  if (annotation?.geometry.type !== 'polygon') return

  latestFreehandId = annotation.id
})

function editLatestFreehand() {
  if (latestFreehandId === null) return

  editor.tools.selectAnnotation(latestFreehandId)
  editor.tools.select()

  // Change label
  editor.tools.setSelectionLabel('vehicle')

  // Clone into an independently editable annotation
  const copiedIds = editor.tools.duplicateSelection()
  console.log('Cloned annotations', copiedIds)

  // Delete the current selection
  editor.tools.deleteSelection()
  latestFreehandId = null
}

document.querySelector('#edit-latest')?.addEventListener(
  'click',
  editLatestFreehand,
)
window.addEventListener('beforeunload', stopTracking, { once: true })
```

With the select tool active, drag inside the contour to move the whole shape; drag vertices to adjust boundaries. You can also use `updateAnnotation()`, `updateAnnotationLabel()`, and `removeAnnotation()` by ID.

`simplifyTolerance` defaults to `1.5`. Pass `0` to keep all non-duplicate sample points; passing a negative number, `NaN`, or infinity throws `RangeError`. Fewer than three valid points, zero-area, or self-intersecting paths will not create an annotation.

### 4. Point Tool

Points are independent annotations – they are not disguised as tiny rects. Activate and click the image to place a point:

```ts
editor.tools.point({ labelId: 'person' })

const pointId = editor.addPoint({
  labelId: 'person',
  x: 320,
  y: 180,
})

editor.updateAnnotation(pointId, { type: 'point', x: 340, y: 200 })
editor.tools.selectAnnotation(pointId)
editor.removeAnnotation(pointId)
```

Functional style:

```ts
import { usePoint, addPoint, updateAnnotation, removeAnnotation } from 'cs-label-tool'

usePoint(annotator, { labelId: 'person' })
const id = addPoint(annotator, { labelId: 'person', x: 320, y: 180 })
updateAnnotation(annotator, id, { type: 'point', x: 340, y: 200 })
removeAnnotation(annotator, id)
```

### 5. Polyline Tool

Click point by point; press `Enter` or double-click to finish. Polylines need at least two distinct points.

```ts
editor.tools.polyline({ labelId: 'vehicle' })

const lineId = editor.addPolyline({
  labelId: 'vehicle',
  points: [
    { x: 80, y: 120 },
    { x: 220, y: 140 },
    { x: 360, y: 110 },
  ],
})

editor.updateAnnotation(lineId, {
  type: 'polyline',
  points: [[80, 120], [240, 150], [360, 110]],
})
editor.removeAnnotation(lineId)
```

After selecting a polyline, you can drag the whole line or drag individual vertices. Double-click a segment to insert a new vertex; select a vertex and press `Backspace` to delete it. At least two points remain.

Functional entry points: `usePolyline(annotator)`, `addPolyline(annotator, input)`, `updateAnnotation()`, and `removeAnnotation()`.

### 6. Ellipse and Circle Tool

Drag to draw an ellipse; hold `Shift` while dragging for a perfect circle. After selection, there are eight resize handles and one rotation handle.

```ts
editor.tools.ellipse({ labelId: 'person', minimumRadius: 2 })

const ellipseId = editor.addEllipse({
  labelId: 'person',
  cx: 420,
  cy: 260,
  radiusX: 90,
  radiusY: 50,
  rotation: 15,
})

editor.updateAnnotation(ellipseId, {
  type: 'ellipse',
  cx: 440,
  cy: 280,
  radiusX: 100,
  radiusY: 60,
  rotation: 30,
})
editor.removeAnnotation(ellipseId)
```

Functional entry points: `useEllipse`, `addEllipse`, `resizeEllipse`, `rotateEllipse`, `updateAnnotation`, and `removeAnnotation`.

### 7. Brush Tool

Hold mouse to paint; release to save. Overlapping brush strokes with the same label auto-merge.

```ts
editor.tools.brush({
  labelId: 'person',
  size: 24,           // Brush diameter in original-image coordinates
  color: '#ff4d4f',   // Preview color while dragging
})
```

Brush strokes are stored as `mask` annotations; the final display color comes from the label color. Convert stroke points into a mask without using the mouse:

```ts
import { createBrushMaskGeometry } from 'cs-label-tool'

const geometry = createBrushMaskGeometry({
  imageWidth: 1920,
  imageHeight: 1080,
  brushSize: 24,
  points: [
    { x: 300, y: 220 },
    { x: 340, y: 250 },
    { x: 390, y: 270 },
  ],
})

const maskId = editor.addMask({
  labelId: 'person',
  width: geometry.width,
  height: geometry.height,
  rle: geometry.rle,
})
```

Move, re-label, and delete masks:

```ts
import {
  decodeBinaryMaskRle,
  encodeBinaryMaskRle,
  translateBinaryMask,
} from 'cs-label-tool'

const mask = editor.snapshot().annotations.find(item => item.id === maskId)

if (mask?.geometry.type === 'mask') {
  const pixels = decodeBinaryMaskRle(
    mask.geometry.rle,
    mask.geometry.width,
    mask.geometry.height,
  )
  const movedPixels = translateBinaryMask(
    pixels,
    mask.geometry.width,
    mask.geometry.height,
    20,
    10,
  )
  editor.updateAnnotation(maskId, {
    ...mask.geometry,
    rle: encodeBinaryMaskRle(movedPixels),
  })
}

editor.updateAnnotationLabel(maskId, 'vehicle')
editor.removeAnnotation(maskId)
```

Masks can also be dragged directly with the select tool. When dragged near a same-label mask, they merge into a single annotation.

### 8. Eraser Tool

The eraser does not create new annotations; it only erases existing masks. Rects and polygons are not affected.

```ts
editor.tools.eraser({ size: 18 })
```

Holding the mouse shows the erasure result in real time; releasing commits the data. If a mask is cut into separate regions, each connected component becomes an independent annotation.

```ts
// After erasing, find all masks
const masks = editor.snapshot().annotations.filter(
  item => item.geometry.type === 'mask',
)

// Each piece has its own ID, individually selectable, re-labelable, and deletable
const firstMask = masks[0]
if (firstMask !== undefined) {
  editor.tools.selectAnnotation(firstMask.id)
  editor.tools.setSelectionLabel('vehicle')
  editor.tools.deleteSelection()
}
```

If your backend returns raw binary masks, use these functions:

```ts
import {
  encodeBinaryMaskRle,
  decodeBinaryMaskRle,
  getBinaryMaskBounds,
  splitBinaryMaskComponents,
  binaryMasksWithinDistance,
} from 'cs-label-tool'

const pixels = decodeBinaryMaskRle(rle, width, height)
const bounds = getBinaryMaskBounds(pixels, width, height)
const blocks = splitBinaryMaskComponents(pixels, width, height)
const isNear = binaryMasksWithinDistance(
  blocks[0] ?? new Uint8Array(width * height),
  blocks[1] ?? new Uint8Array(width * height),
  width,
  height,
  8,
)
const firstBlockRle = blocks[0] === undefined
  ? null
  : encodeBinaryMaskRle(blocks[0])
```

### 9. Cancel Current Drawing

Users can press `Escape`. Programmatically:

```ts
editor.tools.cancel()
// Old style still works
editor.cancelGesture()
```

## Multi-Select, Box-Select, and Lasso-Select

Dragging on empty space with the select tool performs box-selection. The lasso tool is for freeform selection of existing annotations. Both modes use "intersects" hit testing – annotations don't need to be fully inside the selection area.

Lasso-selection does not create annotations or bind labels. Use the `freehand()` tool if you need drag-and-hold drawing that produces an editable annotation.

```ts
editor.tools.select() // Drag on empty space for box-select
editor.tools.lasso()  // Hold mouse to lasso existing annotations; release to select

// Select multiple by ID. Groups are expanded by default
import {
  selectAnnotations,
  selectAnnotationsInBounds,
  selectAnnotationsInLasso,
  toggleAnnotationSelection,
} from 'cs-label-tool'

selectAnnotations(editor.annotator, [firstId, secondId])
toggleAnnotationSelection(editor.annotator, thirdId)
selectAnnotationsInBounds(editor.annotator, { x: 0, y: 0, width: 400, height: 300 })
selectAnnotationsInLasso(editor.annotator, [
  { x: 20, y: 20 },
  { x: 300, y: 30 },
  { x: 260, y: 240 },
])

// Select without expanding groups – same as Alt + click on canvas
selectAnnotations(editor.annotator, [firstId], { expandGroups: false })
```

`Shift + click` adds or removes from the selection. Dragging any unlocked member moves all unlocked selected items together; locked items stay in place.

## Grouping, Locking, Hiding, and Layers

Common operations via the bound `editor.tools`:

```ts
editor.tools.groupSelection()
editor.tools.ungroupSelection()
editor.tools.lockSelection(true)
editor.tools.lockSelection(false)
editor.tools.hideSelection(true)
editor.tools.hideSelection(false)
editor.tools.bringSelectionForward()
editor.tools.sendSelectionBackward()
editor.tools.bringSelectionToFront()
editor.tools.sendSelectionToBack()
```

Functional API for list menus and batch operations:

```ts
import {
  groupAnnotations,
  ungroupAnnotations,
  setAnnotationsLocked,
  setAnnotationsHidden,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  removeAnnotations,
  updateAnnotationsLabel,
} from 'cs-label-tool'

const groupId = groupAnnotations(annotator, [rectId, pointId])
ungroupAnnotations(annotator, [rectId])
setAnnotationsLocked(annotator, [rectId], true)
setAnnotationsHidden(annotator, [pointId], true)
bringToFront(annotator, [rectId, pointId])
removeAnnotations(annotator, [rectId, pointId])
updateAnnotationsLabel(annotator, [rectId, pointId], 'vehicle')
```

Locked annotations can still be selected and viewed, but cannot be moved, scaled, rotated, vertex-edited, deleted, hidden, re-labeled, or re-ordered. Single modification throws `ANNOTATION_LOCKED`; batch operations skip locked items and return the actual change count. Hidden annotations are not rendered and do not participate in canvas hit-testing or box-selection.

Selecting any member of a group selects the entire group by default. `Alt + click` selects only the current member. When a group is reduced to a single member, that member is automatically ungrouped.

## Copy, Paste, and Clone

Uses an internal clipboard – does not read from or write to the system clipboard:

```ts
editor.tools.copySelection()
const pastedIds = editor.tools.paste()
const clonedIds = editor.tools.duplicateSelection()
```

Functional style:

```ts
import { copyAnnotations, pasteAnnotations, duplicateAnnotations } from 'cs-label-tool'

copyAnnotations(annotator, [rectId, pointId])
const pastedIds = pasteAnnotations(annotator)
const clonedIds = duplicateAnnotations(annotator, [rectId, pointId])
```

Paste generates new annotation IDs and group IDs, offsetting by 12 screen pixels each time. When zoomed, the offset is still calculated as screen distance. Shortcuts: `Ctrl/Cmd + C`, `Ctrl/Cmd + V`, and `Ctrl/Cmd + D`.

## Image Classification

Classification belongs to the entire image, not a Canvas shape, so it doesn't appear in `annotations` or the spatial index.

```ts
editor.setClassificationOptions([
  { id: 'normal', name: 'Normal', color: '#22c55e' },
  { id: 'abnormal', name: 'Abnormal', color: '#ef4444' },
])

editor.setImageClassification('normal')
console.log(editor.getImageClassification()) // normal
console.log(editor.getClassificationOptions())
editor.clearImageClassification()
```

Functional style:

```ts
import {
  setClassificationOptions,
  setImageClassification,
  getImageClassification,
  getClassificationOptions,
  clearImageClassification,
} from 'cs-label-tool'

setClassificationOptions(annotator, [{ id: 'normal', name: 'Normal' }])
setImageClassification(annotator, 'normal')
clearImageClassification(annotator)
```

Classification is single-choice; setting a new value replaces the old one. Setting a non-existent ID throws `UNKNOWN_CLASSIFICATION`. Classification changes support undo/redo and appear in `getSnapshot()`.

## Annotation Queries & History

```ts
const annotations = editor.queryAnnotations({
  x: 0,
  y: 0,
  width: 500,
  height: 500,
})

if (editor.canUndo()) editor.undo()
if (editor.canRedo()) editor.redo()
```

Functional versions: `addRect`, `addPolygon`, `addMask`, `updateAnnotation`, `updateAnnotationLabel`, `removeAnnotation`, `queryAnnotations`, `undo`, `redo`, `canUndo`, and `canRedo`. All take `annotator` as the first parameter.

## Label Management

```ts
editor.addLabel({ id: 'person', name: 'Person', color: '#ff4d4f' })
editor.setActiveLabel('person')

const activeLabelId = editor.getActiveLabel()

editor.updateLabel('person', {
  name: 'Pedestrian',
  color: '#ff7875',
})
```

Functional versions: `addLabel`, `setActiveLabel`, `getActiveLabel`, `updateLabel`.

## Image & Viewport

```ts
import { createStandardImageSource } from 'cs-label-tool'

await editor.setImage(createStandardImageSource('/images/example.webp'))

editor.fitToScreen()
editor.zoomTo(2)
editor.zoomTo(2, { x: 100, y: 100 })
editor.zoomBy(1.25)
editor.panBy({ x: 100, y: 50 })

console.log(editor.getZoom())
console.log(editor.hasImage())

// Call after container resize
editor.resizeViewport()
```

Functional API also provides coordinate transforms:

```ts
import { imageToClient, clientToImage } from 'cs-label-tool'

const clientPoint = imageToClient(annotator, { x: 100, y: 100 })
const imagePoint = clientToImage(annotator, clientPoint)
```

## Events & Snapshots

```ts
const unsubscribe = editor.subscribe('change', event => {
  switch (event.kind) {
    case 'annotation:add':
    case 'annotation:update':
    case 'annotation:remove':
      console.log(editor.snapshot().annotations)
      break
    case 'selection:update':
      console.log(editor.tools.selection())
      break
  }
})

const snapshot = editor.snapshot()
const json = JSON.stringify(snapshot)

unsubscribe()
```

Snapshot structure:

```ts
interface AnnotationSnapshot {
  readonly schemaVersion: 1
  readonly revision: number
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
  readonly classificationOptions?: readonly ClassificationOption[]
  readonly classificationId?: string | null
}
```

## Custom Tools

```ts
import { addRect, type Tool } from 'cs-label-tool'

const pointMarker: Tool = {
  id: 'point-marker',
  name: 'Point Marker',
  description: 'Create an 8 x 8 point marker',
  cursor: 'crosshair',
  category: 'drawing',
  shortcuts: [{ key: 'm' }],
  handle(input, context) {
    if (input.type !== 'down') return
    addRect(context.annotator, {
      labelId: 'person',
      x: input.imagePoint.x - 4,
      y: input.imagePoint.y - 4,
      width: 8,
      height: 8,
    })
  },
  cancel() {},
}

editor.registerTool(pointMarker)
editor.activateToolById('point-marker')

console.log(editor.getTool('point-marker'))
console.log(editor.listTools())
console.log(editor.listToolsByCategory('drawing'))

editor.unregisterTool('point-marker')
```

You can also activate tool objects through the unified tool API:

```ts
editor.tools.register(pointMarker)
editor.tools.activateById('point-marker')
editor.tools.listByCategory('drawing')
editor.tools.unregister('point-marker')

// Activate a Tool object directly without registration
editor.tools.activate(pointMarker)
```

## Three Entry Points

| Entry                            | Returns             | Use Case                                             |
| -------------------------------- | ------------------- | ---------------------------------------------------- |
| `mount('#app')`                  | `AnnotatorInstance` | Recommended, with Web Component UI and bound methods |
| `create({ container })`          | `AnnotatorInstance` | Custom UI, using bound methods                       |
| `mountAnnotator/createAnnotator` | Raw `Annotator`     | Functional API, framework integration                |
| Default export `csLabelTool`     | Function collection | When you need a single namespace                     |

Default export example:

```ts
import csLabelTool from 'cs-label-tool'

const annotator = csLabelTool.mount('#app', { historyLimit: 100 })
csLabelTool.addLabel(annotator, {
  id: 'person',
  name: 'Person',
  color: '#ff4d4f',
})

await csLabelTool.setImage(
  annotator,
  csLabelTool.createImageSource('/a.webp'),
)

const tools = csLabelTool.createToolApi(annotator)
tools.brush({ size: 24 })
```

## Web Component

```ts
import {
  defineAnnotatorElements,
  type CSAnnotatorElement,
} from 'cs-label-tool'

defineAnnotatorElements()

const element = document.createElement('cs-annotator') as CSAnnotatorElement
document.body.append(element)
const annotator = element.configure({ historyLimit: 100 })
```

Unmount auto-mounted components:

```ts
import { unmountAnnotator } from 'cs-label-tool'

unmountAnnotator('#app')
```

## API Reference

Public exports from the package root, organized by purpose. Instance methods generally omit the first `annotator` parameter; functionality is identical to the functional versions.

### Creation & Destruction

| API                       | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `mount`                   | Create `AnnotatorInstance` with default Web Component UI   |
| `create`                  | Create `AnnotatorInstance` in a container, UI is up to you |
| `mountAnnotator`          | Create raw `Annotator` with default UI                     |
| `createAnnotator`         | Create raw `Annotator`                                     |
| `destroyAnnotator`        | Destroy raw `Annotator`                                    |
| `getSnapshot`             | Get read-only snapshot                                     |
| `defineAnnotatorElements` | Register `<cs-annotator>`                                  |
| `unmountAnnotator`        | Unmount default component                                  |

### Annotations & Labels

| API                                                                              | Purpose                            |
| -------------------------------------------------------------------------------- | ---------------------------------- |
| `addPoint` / `addRect` / `addEllipse` / `addPolyline` / `addPolygon` / `addMask` | Add annotations directly           |
| `updateAnnotation`                                                               | Modify annotation geometry         |
| `updateAnnotationLabel`                                                          | Modify a single annotation's label |
| `removeAnnotation`                                                               | Delete a single annotation         |
| `queryAnnotations`                                                               | Query annotations within a region  |
| `undo` / `redo`                                                                  | Undo and redo                      |
| `canUndo` / `canRedo`                                                            | Check undo/redo availability       |
| `addLabel` / `updateLabel`                                                       | Add or modify labels               |
| `setActiveLabel` / `getActiveLabel`                                              | Set or read the active label       |
| `setClassificationOptions` / `getClassificationOptions`                          | Set or read classification options |
| `setImageClassification` / `getImageClassification` / `clearImageClassification` | Set, read, or clear classification |

### Built-in Tools & Selection

| API                                                                  | Purpose                                     |
| -------------------------------------------------------------------- | ------------------------------------------- |
| `createToolApi`                                                      | Create a tools object bound to an annotator |
| `useSelect` / `useLasso`                                             | Activate select or lasso tool               |
| `useFreehand`                                                        | Activate freehand drawing tool              |
| `usePoint` / `useRect` / `useEllipse` / `usePolyline` / `usePolygon` | Activate vector drawing tools               |
| `useBrush` / `useEraser`                                             | Activate brush or eraser tool               |
| `getActiveToolId`                                                    | Read current tool ID                        |
| `cancelActiveGesture`                                                | Cancel current incomplete operation         |
| `selectAnnotation` / `clearSelection` / `getSelection`               | Manage selection state                      |
| `updateSelectedAnnotationsLabel`                                     | Change label of selected annotations        |
| `deleteSelectedAnnotations`                                          | Delete selected annotations                 |
| `selectAnnotations` / `toggleAnnotationSelection`                    | Multi-select or toggle single annotation    |
| `selectAnnotationsInBounds` / `selectAnnotationsInLasso`             | Select by box or lasso intersection         |
| `groupAnnotations` / `ungroupAnnotations`                            | Group or ungroup                            |
| `setAnnotationsLocked` / `setAnnotationsHidden`                      | Batch lock or hide                          |
| `bringForward` / `sendBackward` / `bringToFront` / `sendToBack`      | Adjust layer order                          |
| `copyAnnotations` / `pasteAnnotations` / `duplicateAnnotations`      | Internal copy, paste, and clone             |

### Tool Registration

| API                                                   | Purpose                                 |
| ----------------------------------------------------- | --------------------------------------- |
| `activateTool` / `activateToolById`                   | Activate a tool object or tool by ID    |
| `registerTool` / `unregisterTool`                     | Register and remove custom tools        |
| `getTool` / `listTools` / `listToolsByCategory`       | Query tools                             |
| `getRegisteredTools` / `getRegisteredToolsByCategory` | Read tools from the underlying registry |
| `createToolRegistry` / `createDefaultToolRegistry`    | Create empty or default tool registry   |

### Image & Viewport

| API                               | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| `createStandardImageSource`       | Create image source from URL, Blob, or ImageBitmap |
| `setImageSource`                  | Load an image                                      |
| `hasImage`                        | Check if image is loaded                           |
| `fitToScreen`                     | Fit the entire image into the viewport             |
| `zoomTo` / `zoomBy` / `getZoom`   | Set, adjust, and read zoom level                   |
| `panBy`                           | Pan the canvas                                     |
| `resizeViewport`                  | Update viewport after container resize             |
| `imageToClient` / `clientToImage` | Convert between image and browser coordinates      |

### Geometry & Mask

| API                                              | Purpose                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `normalizeRect` / `pointInRect`                  | Regular rect calculation and hit testing         |
| `normalizeRotation` / `pointInRotatedRect`       | Angle normalization and rotated rect hit test    |
| `getRotatedRectCorners` / `getRotatedRectBounds` | Rotated rect corners and bounding box            |
| `rectLocalToWorld` / `rectWorldToLocal`          | Rect local vs. image coordinate transforms       |
| `pointInPolygon` / `validatePolygon`             | Polygon hit testing and validation               |
| `moveRect` / `resizeRect` / `rotateRect`         | Calculate moved, resized, or rotated rect        |
| `getRectHandlePoints`                            | Compute eight resize handles and rotation handle |
| `movePolygonVertex` / `removePolygonVertex`      | Move or delete polygon vertices                  |
| `createBrushMaskGeometry`                        | Convert stroke points to MaskGeometry            |
| `encodeBinaryMaskRle` / `decodeBinaryMaskRle`    | Binary mask ↔ RLE conversion                     |
| `getBinaryMaskBounds`                            | Compute actual pixel bounds of a mask            |
| `translateBinaryMask`                            | Translate mask pixels                            |
| `splitBinaryMaskComponents`                      | Split disconnected regions into separate masks   |
| `binaryMasksWithinDistance`                      | Check if two masks are close enough              |

### Low-Level Viewport, Spatial Index & Tool State Machines

These APIs are mainly for custom renderers, framework integration, or custom tools. Not usually needed for standard usage.

| API                                                         | Purpose                                |
| ----------------------------------------------------------- | -------------------------------------- |
| `createViewport` / `fitViewport`                            | Create and fit a viewport              |
| `imageToScreen` / `screenToImage`                           | Image ↔ viewport coordinate conversion |
| `zoomAt` / `panViewport`                                    | Calculate viewport after zoom or pan   |
| `createGridIndex`                                           | Create spatial index                   |
| `insertSpatialItem` / `updateSpatialItem`                   | Add or update index items              |
| `removeSpatialItem` / `querySpatialBounds`                  | Delete or query index items            |
| `createSelectTool` / `createRectTool` / `createPolygonTool` | Create low-level interaction tools     |
| `createFreehandTool`                                        | Create low-level freehand tool         |
| `createBrushTool` / `createEraserTool`                      | Create low-level mask tools            |
| `createRectToolState` / `reduceRectTool`                    | Use rect state machine standalone      |
| `createPolygonToolState` / `reducePolygonTool`              | Use polygon state machine standalone   |

### Events

| API                                        | Purpose                                                             |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `subscribe(annotator, 'change', listener)` | Listen for annotation, label, image, selection, and history changes |
| `subscribe(annotator, 'error', listener)`  | Listen for errors thrown in subscription callbacks                  |

Public types include `Annotator`, `AnnotatorInstance`, `Annotation`, `PolygonAnnotation`, `RectGeometry`, `PolygonGeometry`, `MaskGeometry`, `FreehandToolOptions`, `LabelDefinition`, `Tool`, `AnnotationToolApi`, `ImageSource`, `ViewportState`, `Point`, and `Bounds`.

## Core Types

```ts
interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly rotation?: number // Clockwise degrees
}

interface PolygonGeometry {
  readonly type: 'polygon'
  readonly points: readonly (readonly [number, number])[]
}

interface PointGeometry {
  readonly type: 'point'
  readonly x: number
  readonly y: number
}

interface PolylineGeometry {
  readonly type: 'polyline'
  readonly points: readonly (readonly [number, number])[]
}

interface EllipseGeometry {
  readonly type: 'ellipse'
  readonly cx: number
  readonly cy: number
  readonly radiusX: number
  readonly radiusY: number
  readonly rotation?: number
}

interface MaskGeometry {
  readonly type: 'mask'
  readonly width: number
  readonly height: number
  readonly rle: readonly number[]
}

interface AnnotationBase {
  readonly groupId?: string
  readonly locked?: boolean
  readonly hidden?: boolean
}

type Annotation =
  | PointAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | PolylineAnnotation
  | PolygonAnnotation
  | MaskAnnotation
type ToolCategory = 'selection' | 'drawing' | 'navigation' | 'utility'
```

## Development Commands

```bash
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```


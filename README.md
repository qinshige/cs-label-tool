# cs-label-tool

在线 Demo：<https://qinshige.github.io/cs-label-tool/>

一个用 Canvas 做图片标注的 TypeScript 库。没有运行时依赖，可以直接调用函数，也可以使用已经绑定好的 `editor` 实例。

当前支持：

- 图片 URL、`Blob`、`ImageBitmap` 加载。
- 选择、框选、套索选择、自由轮廓、点、矩形、椭圆、折线、多边形、涂抹和橡皮擦工具。
- 矩形和椭圆的移动、旋转与八方向缩放，折线和多边形的顶点编辑。
- 多选、图层顺序、锁定、隐藏、复制粘贴、克隆、分组和取消分组。
- 图片级单选分类，分类结果与 Canvas 标注一起进入快照。
- Mask 点击选择、拖拽、删除、改标签和近距离合并。
- 涂抹区域重叠合并；橡皮擦实时透明预览和连通域分割。
- 缩放、平移、适屏、坐标转换和 DPR 高分屏渲染。
- 标签管理、区域查询、撤销重做、事件订阅和自定义工具。

## 环境与安装

- Chrome、Edge、Firefox 最近两个大版本
- Safari 17+
- 仅提供 ESM

```bash
npm install cs-label-tool
```

容器必须具有可计算的宽高：

```html
<div id="annotator" style="width: 100%; height: 600px"></div>
```

## 快速开始

推荐使用绑定实例。实例方法不需要重复传递 `annotator`：

```ts
import { mount, createStandardImageSource } from 'cs-label-tool'

const editor = mount('#annotator', { historyLimit: 100 })

editor.addLabel({ id: 'person', name: '人物', color: '#ff4d4f' })
editor.addLabel({ id: 'vehicle', name: '车辆', color: '#1677ff' })
editor.setActiveLabel('person')

await editor.setImage(createStandardImageSource('/images/example.webp'))
editor.fitToScreen()
editor.tools.rect()
```

完整页面示例：

```html
<div id="toolbar">
  <button id="select">选择</button>
  <button id="freehand">自由轮廓</button>
  <button id="point">点</button>
  <button id="rect">矩形</button>
  <button id="ellipse">椭圆</button>
  <button id="polyline">折线</button>
  <button id="polygon">多边形</button>
  <button id="brush">涂抹</button>
  <button id="eraser">橡皮擦</button>
  <button id="delete">删除选中</button>
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

editor.addLabel({ id: 'person', name: '人物', color: '#ff4d4f' })
editor.addLabel({ id: 'vehicle', name: '车辆', color: '#1677ff' })
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

## 统一工具 API

### 实例调用

`editor.tools` 封装了所有内置交互工具和常用选择操作：

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

### 函数式调用

已有原始 `Annotator` 时，可以创建一次绑定工具对象：

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

addLabel(annotator, { id: 'person', name: '人物', color: '#ff4d4f' })
setActiveLabel(annotator, 'person')
await setImageSource(annotator, createStandardImageSource('/a.webp'))

const tools = createToolApi(annotator)
tools.freehand({ labelId: 'person', simplifyTolerance: 2 })
tools.brush({ size: 20 })
```

也可以直接调用原有函数：

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

### 工具参数

| 工具   | 方法                  | 参数                                  |
| ---- | ------------------- | ----------------------------------- |
| 选择   | `select()`          | 无                                   |
| 套索选择 | `lasso()`           | 无                                   |
| 自由轮廓 | `freehand(options)` | `labelId?`, `simplifyTolerance?`    |
| 点    | `point(options)`    | `labelId?`                          |
| 矩形   | `rect(options)`     | `labelId?`, `minimumSize?`          |
| 椭圆   | `ellipse(options)`  | `labelId?`, `minimumRadius?`        |
| 折线   | `polyline(options)` | `labelId?`                          |
| 多边形  | `polygon(options)`  | `labelId?`                          |
| 涂抹   | `brush(options)`    | `labelId?`, `size?`, `color?`（预览颜色） |
| 橡皮擦  | `eraser(options)`   | `size?`                             |

未传 `labelId` 时，点、矩形、椭圆、折线、多边形、自由轮廓和涂抹使用当前激活标签。调用绘制工具前必须加载图片并激活一个标签。

### 工具行为

- 点：单击生成一个独立点，选择后可直接拖动。
- 矩形：按下拖动，抬起完成；选择后可移动、旋转和拖动八个控制点缩放。
- 椭圆：按下拖动，抬起完成；按住 `Shift` 画正圆，选择后的编辑方式与矩形一致。
- 折线：逐点点击，按 `Enter` 或双击完成；双击线段插入顶点，`Backspace` 删除选中顶点。
- 多边形：逐点点击，按 `Enter` 或双击完成，`Backspace` 删除最后一个点。
- 自由轮廓：按住鼠标连续绘制，抬起后自动闭合并生成带标签的 `PolygonAnnotation`。
- 涂抹：按下拖动，抬起完成；同标签且重叠的 mask 自动合并。
- 橡皮擦：按下拖动时实时透明擦除，抬起提交；只影响 mask。
- Mask 分割：橡皮擦切断区域后，每个连通块成为独立标注。
- Mask 合并：选择后拖动，同标签区域进入约 8 屏幕像素范围时自动合并。
- 选择：空白处拖动是框选，`Shift + 点击` 追加或取消选择；组内标注默认整组选中，`Alt + 点击` 只选当前成员。
- 视图导航：按住空格或中键拖动画布；滚轮以鼠标位置为锚点缩放。

缩放时图片层、标注层和交互层共享同一 viewport 变换。矩形、多边形、标签和控制点会按当前 DPR 重新绘制；Mask 放大时关闭插值，保持像素边界清晰。原始位图本身仍受源图片分辨率限制，不能像真正的 SVG 一样无限放大。

## 每个工具怎么用

下面的例子都接着“快速开始”里的 `editor` 使用。先加载图片、添加标签，再启用工具。

### 1. 选择工具

选择工具不创建标注。它用来点击、拖动、缩放、改标签和删除已有标注。

```ts
// 启用选择工具，之后直接在画布上点击标注
editor.tools.select()

// 已经知道标注 ID 时，也可以直接选中
editor.tools.selectAnnotation(annotationId)

// 查看当前选中了哪些标注
const selectedIds = editor.tools.selection()

// 修改选中标注的标签，返回修改数量
const changedCount = editor.tools.setSelectionLabel('vehicle')

// 删除选中标注，返回删除数量
const deletedCount = editor.tools.deleteSelection()

// 只取消选择，不删除数据
editor.tools.clearSelection()
```

页面上的常见删除按钮可以这样写：

```ts
document.querySelector('#delete')?.addEventListener('click', () => {
  const count = editor.tools.deleteSelection()
  console.log(`删除了 ${count} 个标注`)
})
```

函数式写法：

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

### 2. 矩形工具

启用工具后，在图片上按住鼠标拖动，松开鼠标就会生成矩形。

```ts
editor.tools.rect({
  labelId: 'person', // 不传就用当前激活标签
  minimumSize: 3,   // 小于 3 个原图像素的矩形不保存
})
```

不用鼠标，也可以直接用代码添加：

```ts
const rectId = editor.addRect({
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
  rotation: 25, // 可选，顺时针角度；不传就是 0 度
})
```

编辑矩形：

```ts
// 先选中。用户也可以切到选择工具后直接点击矩形
editor.tools.selectAnnotation(rectId)
editor.tools.select()

// 直接修改坐标、大小和角度
editor.updateAnnotation(rectId, {
  type: 'rect',
  x: 120,
  y: 90,
  width: 320,
  height: 480,
  rotation: 45,
})

// 删除
editor.removeAnnotation(rectId)
```

选择工具下，拖动矩形内部可以移动，拖动八个方形控制点可以缩放。上边中间外侧的圆形控制点用于旋转。矩形旋转后仍然按照自身方向缩放，不会退化成普通多边形。

`rotation` 的单位是度，正值表示顺时针旋转。API 会把角度整理到 `0` 到 `360` 之间，例如 `450` 度保存为 `90` 度。旧数据不包含 `rotation` 时仍按普通矩形处理。

### 3. 多边形工具

启用后逐点点击。按 `Enter` 或双击结束，按 `Backspace` 删除刚加的点，按 `Escape` 取消这次绘制。

```ts
editor.tools.polygon({ labelId: 'person' })
```

直接用代码添加时，点使用 `{ x, y }`：

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

移动顶点、删除顶点和保存修改：

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

  // 多边形至少保留 3 个有效顶点。不能删除时返回 null
  const withoutSecondPoint = removePolygonVertex(moved, 1)
  if (withoutSecondPoint !== null) {
    editor.updateAnnotation(polygonId, withoutSecondPoint)
  }
}

editor.removeAnnotation(polygonId)
```

快照里的 `PolygonGeometry.points` 是 `[x, y]` 元组；`addPolygon()` 的输入是 `{ x, y }`。这两个格式不要混用。

### 3.1 自由轮廓工具

自由轮廓适合快速勾画不规则目标。按住鼠标开始绘制，移动鼠标记录轮廓，抬起后自动闭合。保存结果仍然是标准 `PolygonAnnotation`，不是套索选区，也没有新增一套特殊数据格式。

使用当前激活标签：

```ts
editor.setActiveLabel('person')
editor.tools.freehand()
```

指定标签和路径简化精度：

```ts
editor.tools.freehand({
  labelId: 'person',
  // 单位是原图像素。数值越大，生成的顶点越少
  simplifyTolerance: 2,
})
```

函数式写法：

```ts
import { useFreehand } from 'cs-label-tool'

useFreehand(annotator, {
  labelId: 'person',
  simplifyTolerance: 2,
})
```

交互式绘制不会同步返回 ID。可以通过 `change` 事件记录刚创建的自由轮廓，然后在业务按钮中执行编辑。选中以后，移动、顶点编辑、换标签、复制和删除都与普通多边形相同：

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

  // 改标签
  editor.tools.setSelectionLabel('vehicle')

  // 克隆一个可以独立编辑的新标注
  const copiedIds = editor.tools.duplicateSelection()
  console.log('复制出的标注', copiedIds)

  // 删除当前选中的标注
  editor.tools.deleteSelection()
  latestFreehandId = null
}

document.querySelector('#edit-latest')?.addEventListener(
  'click',
  editLatestFreehand,
)
window.addEventListener('beforeunload', stopTracking, { once: true })
```

选择工具激活后，拖动轮廓内部可以整体移动，拖动顶点可以修改边界。也可以直接使用 `updateAnnotation()`、`updateAnnotationLabel()` 和 `removeAnnotation()` 按 ID 操作。

`simplifyTolerance` 默认是 `1.5`。传 `0` 会保留所有非重复采样点；传负数、`NaN` 或无限大会抛出 `RangeError`。少于三个有效点、零面积或自相交的路径不会创建标注。

### 4. 点工具

点是独立标注，不会伪装成一个很小的矩形。启用后单击图片即可落点：

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

函数式写法：

```ts
import { usePoint, addPoint, updateAnnotation, removeAnnotation } from 'cs-label-tool'

usePoint(annotator, { labelId: 'person' })
const id = addPoint(annotator, { labelId: 'person', x: 320, y: 180 })
updateAnnotation(annotator, id, { type: 'point', x: 340, y: 200 })
removeAnnotation(annotator, id)
```

### 5. 折线工具

逐点点击，按 `Enter` 或双击完成。折线至少要有两个不同的点。

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

选择折线后可拖动整条线，也可以拖顶点。双击线段会插入新顶点，选中顶点后按 `Backspace` 删除；至少保留两个点。

函数式入口是 `usePolyline(annotator)`、`addPolyline(annotator, input)`、`updateAnnotation()` 和 `removeAnnotation()`。

### 6. 椭圆和圆形工具

拖动绘制椭圆，按住 `Shift` 拖动会得到正圆。选择后有八个缩放点和一个旋转点。

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

函数式入口是 `useEllipse`、`addEllipse`、`resizeEllipse`、`rotateEllipse`、`updateAnnotation` 和 `removeAnnotation`。

### 7. 涂抹工具

按住鼠标开始涂，松开鼠标保存。同标签的涂抹区域发生重叠时会自动合并。

```ts
editor.tools.brush({
  labelId: 'person',
  size: 24,           // 原图坐标中的画笔直径
  color: '#ff4d4f',  // 拖动时的预览颜色
})
```

涂抹保存后是 `mask` 标注，最终显示颜色来自标签颜色。可以不经过鼠标，直接把一组笔迹点转成 mask：

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

移动、改标签和删除 mask：

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

在选择工具下也可以直接拖动 mask。拖到同标签 mask 附近时，两块会合并成一个标注。

### 8. 橡皮擦工具

橡皮擦不会创建新标注，它只擦已有的 mask。矩形和多边形不会被擦掉。

```ts
editor.tools.eraser({ size: 18 })
```

按住鼠标时画面会实时显示擦除结果，松开鼠标后写入数据。如果一块 mask 被擦断，剩下的每个连通区域都会变成独立标注。

```ts
// 擦完以后找到所有 mask
const masks = editor.snapshot().annotations.filter(
  item => item.geometry.type === 'mask',
)

// 每块都有自己的 ID，可以单独选择、改标签和删除
const firstMask = masks[0]
if (firstMask !== undefined) {
  editor.tools.selectAnnotation(firstMask.id)
  editor.tools.setSelectionLabel('vehicle')
  editor.tools.deleteSelection()
}
```

如果服务端直接返回二进制 mask，可以用这些函数自行处理：

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

### 9. 取消当前绘制

用户可以按 `Escape`。代码里可以这样取消：

```ts
editor.tools.cancel()
// 旧写法仍然可用
editor.cancelGesture()
```

## 多选、框选和套索选择

选择工具在空白处拖动就是框选，套索选择用于自由圈选已有标注。两种选区都是“相交就选中”，不要求标注完全落在选区里。

套索选择不会创建标注，也不绑定标签。需要按住拖动并生成可编辑标注时，请使用前面的 `freehand()` 自由轮廓工具。

```ts
editor.tools.select() // 空白拖动框选
editor.tools.lasso()  // 按住鼠标圈选已有标注，松开完成选择

// 已知 ID 时直接多选。默认会展开整组
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

// 不展开组，只选当前成员。画布上的 Alt + 点击也是这个行为
selectAnnotations(editor.annotator, [firstId], { expandGroups: false })
```

`Shift + 点击`用于追加或取消选择。多选后拖动任意未锁定成员，所有未锁定选中项会一起移动；锁定项留在原位。

## 分组、锁定、隐藏和图层

常用操作可以直接走绑定好的 `editor.tools`：

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

函数式 API 适合列表菜单和批量任务：

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

锁定标注仍可选中和查看，但不能移动、缩放、旋转、改顶点、删除、隐藏、改标签或调整图层。单条修改会抛出 `ANNOTATION_LOCKED`；批量操作会跳过锁定项，并返回实际修改数量。隐藏标注不渲染，也不参与画布命中和框选。

组内任意成员默认带出整组。`Alt + 点击`只选当前成员。组删到只剩一个成员时，最后一个成员会自动解除分组。

## 复制、粘贴和克隆

这里使用库内部剪贴板，不会读取或覆盖用户的系统剪贴板：

```ts
editor.tools.copySelection()
const pastedIds = editor.tools.paste()
const clonedIds = editor.tools.duplicateSelection()
```

函数式写法：

```ts
import { copyAnnotations, pasteAnnotations, duplicateAnnotations } from 'cs-label-tool'

copyAnnotations(annotator, [rectId, pointId])
const pastedIds = pasteAnnotations(annotator)
const clonedIds = duplicateAnnotations(annotator, [rectId, pointId])
```

粘贴会生成新的标注 ID 和组 ID，并按 12 个屏幕像素逐次错开。缩放画布后，偏移仍按屏幕距离计算。快捷键是 `Ctrl/Cmd + C`、`Ctrl/Cmd + V` 和 `Ctrl/Cmd + D`。

## 图片单选分类

分类属于整张图片，不是 Canvas 图形，所以不会出现在 `annotations` 或空间索引里。

```ts
editor.setClassificationOptions([
  { id: 'normal', name: '正常', color: '#22c55e' },
  { id: 'abnormal', name: '异常', color: '#ef4444' },
])

editor.setImageClassification('normal')
console.log(editor.getImageClassification()) // normal
console.log(editor.getClassificationOptions())
editor.clearImageClassification()
```

函数式写法：

```ts
import {
  setClassificationOptions,
  setImageClassification,
  getImageClassification,
  getClassificationOptions,
  clearImageClassification,
} from 'cs-label-tool'

setClassificationOptions(annotator, [{ id: 'normal', name: '正常' }])
setImageClassification(annotator, 'normal')
clearImageClassification(annotator)
```

分类是单选，设置新值会替换旧值。设置不存在的 ID 会抛出 `UNKNOWN_CLASSIFICATION`。分类变化支持撤销重做，也会进入 `getSnapshot()`。

## 标注查询和历史记录

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

函数式版本为 `addRect`、`addPolygon`、`addMask`、`updateAnnotation`、`updateAnnotationLabel`、`removeAnnotation`、`queryAnnotations`、`undo`、`redo`、`canUndo` 和 `canRedo`。这些函数的第一个参数都是 `annotator`。

## 标签管理

```ts
editor.addLabel({ id: 'person', name: '人物', color: '#ff4d4f' })
editor.setActiveLabel('person')

const activeLabelId = editor.getActiveLabel()

editor.updateLabel('person', {
  name: '行人',
  color: '#ff7875',
})
```

函数式版本：`addLabel`、`setActiveLabel`、`getActiveLabel`、`updateLabel`。

## 图片与视图

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

// 容器尺寸发生变化后调用
editor.resizeViewport()
```

函数式 API 还提供坐标转换：

```ts
import { imageToClient, clientToImage } from 'cs-label-tool'

const clientPoint = imageToClient(annotator, { x: 100, y: 100 })
const imagePoint = clientToImage(annotator, clientPoint)
```

## 事件与快照

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

快照结构：

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

## 自定义工具

```ts
import { addRect, type Tool } from 'cs-label-tool'

const pointMarker: Tool = {
  id: 'point-marker',
  name: '点标记',
  description: '创建一个 8 x 8 的点标记',
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

也可以通过统一工具 API 激活工具对象：

```ts
editor.tools.register(pointMarker)
editor.tools.activateById('point-marker')
editor.tools.listByCategory('drawing')
editor.tools.unregister('point-marker')

// 不注册也可以直接激活一个 Tool 对象
editor.tools.activate(pointMarker)
```

## 三种入口的区别

| 入口                               | 返回值                 | 适用场景                        |
| -------------------------------- | ------------------- | --------------------------- |
| `mount('#app')`                  | `AnnotatorInstance` | 推荐，带 Web Component UI 和绑定方法 |
| `create({ container })`          | `AnnotatorInstance` | 自建 UI，使用绑定方法                |
| `mountAnnotator/createAnnotator` | 原始 `Annotator`      | 函数式 API、框架适配                |
| 默认导出 `csLabelTool`               | 函数集合                | 需要单一命名空间时                   |

默认导出示例：

```ts
import csLabelTool from 'cs-label-tool'

const annotator = csLabelTool.mount('#app', { historyLimit: 100 })
csLabelTool.addLabel(annotator, {
  id: 'person',
  name: '人物',
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

卸载自动挂载的组件：

```ts
import { unmountAnnotator } from 'cs-label-tool'

unmountAnnotator('#app')
```

## API 名字清单

这里按用途列出包根目录公开导出的 API。实例方法通常省略第一个 `annotator` 参数，功能与函数式版本相同。

### 创建和销毁

| API                       | 用途                                          |
| ------------------------- | ------------------------------------------- |
| `mount`                   | 创建带默认 Web Component 界面的 `AnnotatorInstance` |
| `create`                  | 在指定容器创建 `AnnotatorInstance`，界面由项目自己做        |
| `mountAnnotator`          | 创建带默认界面的原始 `Annotator`                      |
| `createAnnotator`         | 创建原始 `Annotator`                            |
| `destroyAnnotator`        | 销毁原始 `Annotator`                            |
| `getSnapshot`             | 获取只读快照                                      |
| `defineAnnotatorElements` | 注册 `<cs-annotator>`                         |
| `unmountAnnotator`        | 卸载默认组件                                      |

### 标注和标签

| API                                                                              | 用途           |
| -------------------------------------------------------------------------------- | ------------ |
| `addPoint` / `addRect` / `addEllipse` / `addPolyline` / `addPolygon` / `addMask` | 直接添加标注       |
| `updateAnnotation`                                                               | 修改标注几何       |
| `updateAnnotationLabel`                                                          | 修改单条标注的标签    |
| `removeAnnotation`                                                               | 删除单条标注       |
| `queryAnnotations`                                                               | 查询指定图片区域里的标注 |
| `undo` / `redo`                                                                  | 撤销和重做        |
| `canUndo` / `canRedo`                                                            | 判断当前能否撤销或重做  |
| `addLabel` / `updateLabel`                                                       | 添加或修改标签      |
| `setActiveLabel` / `getActiveLabel`                                              | 设置或读取当前绘制标签  |
| `setClassificationOptions` / `getClassificationOptions`                          | 设置或读取图片分类选项  |
| `setImageClassification` / `getImageClassification` / `clearImageClassification` | 设置、读取或清空单选分类 |

### 内置工具和选择

| API                                                                  | 用途                      |
| -------------------------------------------------------------------- | ----------------------- |
| `createToolApi`                                                      | 创建绑定到某个 annotator 的工具对象 |
| `useSelect` / `useLasso`                                             | 启用选择或套索选择工具             |
| `useFreehand`                                                        | 启用自由轮廓绘制工具              |
| `usePoint` / `useRect` / `useEllipse` / `usePolyline` / `usePolygon` | 启用矢量绘制工具                |
| `useBrush` / `useEraser`                                             | 启用涂抹、橡皮擦工具              |
| `getActiveToolId`                                                    | 读取当前工具 ID               |
| `cancelActiveGesture`                                                | 取消当前未完成操作               |
| `selectAnnotation` / `clearSelection` / `getSelection`               | 管理选择状态                  |
| `updateSelectedAnnotationsLabel`                                     | 修改选中标注的标签               |
| `deleteSelectedAnnotations`                                          | 删除选中标注                  |
| `selectAnnotations` / `toggleAnnotationSelection`                    | 多选或切换单条选择               |
| `selectAnnotationsInBounds` / `selectAnnotationsInLasso`             | 按框或套索相交选择               |
| `groupAnnotations` / `ungroupAnnotations`                            | 分组或取消分组                 |
| `setAnnotationsLocked` / `setAnnotationsHidden`                      | 批量锁定或隐藏                 |
| `bringForward` / `sendBackward` / `bringToFront` / `sendToBack`      | 调整图层顺序                  |
| `copyAnnotations` / `pasteAnnotations` / `duplicateAnnotations`      | 内部复制、粘贴和克隆              |

### 工具注册

| API                                                   | 用途               |
| ----------------------------------------------------- | ---------------- |
| `activateTool` / `activateToolById`                   | 激活工具对象或指定 ID 的工具 |
| `registerTool` / `unregisterTool`                     | 注册和移除自定义工具       |
| `getTool` / `listTools` / `listToolsByCategory`       | 查询工具             |
| `getRegisteredTools` / `getRegisteredToolsByCategory` | 读取底层注册表中的工具      |
| `createToolRegistry` / `createDefaultToolRegistry`    | 创建空注册表或默认注册表     |

### 图片和视图

| API                               | 用途                             |
| --------------------------------- | ------------------------------ |
| `createStandardImageSource`       | 从 URL、Blob 或 ImageBitmap 创建图片源 |
| `setImageSource`                  | 加载图片                           |
| `hasImage`                        | 判断图片是否加载完成                     |
| `fitToScreen`                     | 让整张图片进入画布                      |
| `zoomTo` / `zoomBy` / `getZoom`   | 设置、调整和读取缩放比例                   |
| `panBy`                           | 平移画布                           |
| `resizeViewport`                  | 容器尺寸变化后更新画布                    |
| `imageToClient` / `clientToImage` | 原图坐标与浏览器坐标互转                   |

### 几何和 Mask

| API                                              | 用途                  |
| ------------------------------------------------ | ------------------- |
| `normalizeRect` / `pointInRect`                  | 普通矩形计算和命中判断         |
| `normalizeRotation` / `pointInRotatedRect`       | 角度整理和旋转矩形精确命中       |
| `getRotatedRectCorners` / `getRotatedRectBounds` | 旋转矩形顶点和外接包围盒        |
| `rectLocalToWorld` / `rectWorldToLocal`          | 矩形局部坐标与图片坐标互转       |
| `pointInPolygon` / `validatePolygon`             | 多边形命中判断和有效性检查       |
| `moveRect` / `resizeRect` / `rotateRect`         | 计算移动、缩放或旋转后的矩形      |
| `getRectHandlePoints`                            | 计算八个缩放点和旋转手柄位置      |
| `movePolygonVertex` / `removePolygonVertex`      | 移动或删除多边形顶点          |
| `createBrushMaskGeometry`                        | 把笔迹点转成 MaskGeometry |
| `encodeBinaryMaskRle` / `decodeBinaryMaskRle`    | 二进制 mask 与 RLE 互转   |
| `getBinaryMaskBounds`                            | 计算 mask 的实际像素边界     |
| `translateBinaryMask`                            | 平移 mask 像素          |
| `splitBinaryMaskComponents`                      | 把不相连的区域拆成多个 mask    |
| `binaryMasksWithinDistance`                      | 判断两块 mask 是否足够接近    |

### 底层视口、空间索引和工具状态机

这些 API 主要给自定义渲染器、框架适配或自定义工具使用。普通业务通常用不到。

| API                                                         | 用途                  |
| ----------------------------------------------------------- | ------------------- |
| `createViewport` / `fitViewport`                            | 创建和适配 viewport      |
| `imageToScreen` / `screenToImage`                           | 原图坐标与 viewport 坐标互转 |
| `zoomAt` / `panViewport`                                    | 计算缩放或平移后的 viewport  |
| `createGridIndex`                                           | 创建空间索引              |
| `insertSpatialItem` / `updateSpatialItem`                   | 添加或更新索引项            |
| `removeSpatialItem` / `querySpatialBounds`                  | 删除或查询索引项            |
| `createSelectTool` / `createRectTool` / `createPolygonTool` | 创建底层交互工具            |
| `createFreehandTool`                                        | 创建自由轮廓底层工具          |
| `createBrushTool` / `createEraserTool`                      | 创建底层 mask 工具        |
| `createRectToolState` / `reduceRectTool`                    | 单独使用矩形状态机           |
| `createPolygonToolState` / `reducePolygonTool`              | 单独使用多边形状态机          |

### 事件

| API                                        | 用途                 |
| ------------------------------------------ | ------------------ |
| `subscribe(annotator, 'change', listener)` | 监听标注、标签、图片、选择和历史变化 |
| `subscribe(annotator, 'error', listener)`  | 监听订阅回调抛出的错误        |

公共类型包括 `Annotator`、`AnnotatorInstance`、`Annotation`、`PolygonAnnotation`、`RectGeometry`、`PolygonGeometry`、`MaskGeometry`、`FreehandToolOptions`、`LabelDefinition`、`Tool`、`AnnotationToolApi`、`ImageSource`、`ViewportState`、`Point` 和 `Bounds`。

## 核心类型

```ts
interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly rotation?: number // 顺时针角度，单位为度
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

## 开发命令

```bash
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```


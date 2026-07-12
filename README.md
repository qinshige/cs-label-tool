# cs-label-tool

面向 AI 图像标注场景的原生 TypeScript Canvas 工具库。无运行时依赖，提供函数式 API、绑定实例 API 和可选 Web Component UI。

当前支持：

- 图片 URL、`Blob`、`ImageBitmap` 加载。
- 选择、矩形、多边形、涂抹和橡皮擦工具。
- 矩形移动与八方向缩放、多边形顶点编辑。
- Mask 点击选择、拖拽、删除、改标签和近距离合并。
- 涂抹区域重叠合并；橡皮擦实时透明预览和连通域分割。
- 缩放、平移、适屏、坐标转换和 DPR 高分屏渲染。
- 标签管理、区域查询、撤销重做、事件订阅和自定义工具。

## 环境与安装

- Node.js 22.12+
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

document.querySelector('#rect')?.addEventListener('click', () => {
  editor.tools.rect({ minimumSize: 3 })
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

// 页面卸载时调用
unsubscribe()
editor.destroy()
```

## 统一工具 API

### 实例调用

`editor.tools` 封装了所有内置交互工具和常用选择操作：

```ts
editor.tools.select()
editor.tools.rect()
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
tools.brush({ size: 20 })
```

也可以直接调用原有函数：

```ts
import {
  useSelect,
  useRect,
  usePolygon,
  useBrush,
  useEraser,
} from 'cs-label-tool'

useSelect(annotator)
useRect(annotator, { labelId: 'person', minimumSize: 3 })
usePolygon(annotator, { labelId: 'person' })
useBrush(annotator, { labelId: 'person', size: 24, color: '#ff4d4f' })
useEraser(annotator, { size: 18 })
```

### 工具参数

| 工具 | 方法 | 参数 |
| --- | --- | --- |
| 选择 | `select()` | 无 |
| 矩形 | `rect(options)` | `labelId?`, `minimumSize?` |
| 多边形 | `polygon(options)` | `labelId?` |
| 涂抹 | `brush(options)` | `labelId?`, `size?`, `color?` |
| 橡皮擦 | `eraser(options)` | `size?` |

未传 `labelId` 时，矩形、多边形和涂抹使用当前激活标签。调用绘制工具前必须加载图片并激活一个标签。

### 工具行为

- 矩形：按下拖动，抬起完成；选择后可移动和拖动边框缩放。
- 多边形：逐点点击，按 `Enter` 或双击完成，`Backspace` 删除最后一个点。
- 涂抹：按下拖动，抬起完成；同标签且重叠的 mask 自动合并。
- 橡皮擦：按下拖动时实时透明擦除，抬起提交；只影响 mask。
- Mask 分割：橡皮擦切断区域后，每个连通块成为独立标注。
- Mask 合并：选择后拖动，同标签区域进入约 8 屏幕像素范围时自动合并。

## 选择、编辑与删除

```ts
// 通过 ID 选择
editor.tools.selectAnnotation(annotationId)

// 当前选择
const selectedIds = editor.tools.selection()

// 修改所有选中标注的标签，返回修改数量
const changed = editor.tools.setSelectionLabel('vehicle')

// 删除所有选中标注，返回删除数量
const removed = editor.tools.deleteSelection()

// 清除选择
editor.tools.clearSelection()
```

对应函数式 API：

```ts
import {
  selectAnnotation,
  getSelection,
  clearSelection,
  updateSelectedAnnotationsLabel,
  deleteSelectedAnnotations,
  getActiveToolId,
} from 'cs-label-tool'

selectAnnotation(annotator, annotationId)
updateSelectedAnnotationsLabel(annotator, 'vehicle')
deleteSelectedAnnotations(annotator)
clearSelection(annotator)

console.log(getSelection(annotator))
console.log(getActiveToolId(annotator))
```

直接更新单条标注：

```ts
editor.updateAnnotationLabel(annotationId, 'vehicle')

editor.updateAnnotation(rectId, {
  type: 'rect',
  x: 120,
  y: 90,
  width: 300,
  height: 500,
})

editor.removeAnnotation(annotationId)
```

## 标注命令

### 矩形

```ts
const rectId = editor.addRect({
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
})
```

### 多边形

程序化添加多边形时，`points` 使用 `{ x, y }`：

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

快照中的 `PolygonGeometry.points` 使用 `[x, y]` 元组，这是输入格式与持久化格式的区别。

### Mask

Mask 使用从 0 开始、0/1 交替的行程编码：

```ts
import { encodeBinaryMaskRle } from 'cs-label-tool'

const width = 640
const height = 480
const pixels = new Uint8Array(width * height)
pixels[100 * width + 120] = 1

const maskId = editor.addMask({
  labelId: 'person',
  width,
  height,
  rle: encodeBinaryMaskRle(pixels),
})
```

可用的 mask 工具函数：

```ts
import {
  encodeBinaryMaskRle,
  decodeBinaryMaskRle,
  getBinaryMaskBounds,
  translateBinaryMask,
  splitBinaryMaskComponents,
  binaryMasksWithinDistance,
} from 'cs-label-tool'
```

### 查询与历史

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

函数式版本为 `addRect`、`addPolygon`、`addMask`、`updateAnnotation`、`updateAnnotationLabel`、`removeAnnotation`、`queryAnnotations`、`undo`、`redo`、`canUndo` 和 `canRedo`，第一个参数均为 `annotator`。

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

| 入口 | 返回值 | 适用场景 |
| --- | --- | --- |
| `mount('#app')` | `AnnotatorInstance` | 推荐，带 Web Component UI 和绑定方法 |
| `create({ container })` | `AnnotatorInstance` | 自建 UI，使用绑定方法 |
| `mountAnnotator/createAnnotator` | 原始 `Annotator` | 函数式 API、框架适配 |
| 默认导出 `csLabelTool` | 函数集合 | 需要单一命名空间时 |

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

## 核心类型

```ts
interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface PolygonGeometry {
  readonly type: 'polygon'
  readonly points: readonly (readonly [number, number])[]
}

interface MaskGeometry {
  readonly type: 'mask'
  readonly width: number
  readonly height: number
  readonly rle: readonly number[]
}

type Annotation = RectAnnotation | PolygonAnnotation | MaskAnnotation
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

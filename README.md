# cs-label-tool

专为 AI 图像标注软件设计的原生 TypeScript 前端库。无运行时依赖，同时提供函数式 headless 引擎和可选的原生 Web Component UI。

当前里程碑支持：

- 普通图片 URL、`Blob`、`ImageBitmap` 加载。
- 原图坐标系下的缩放、平移、适屏和双向坐标转换。
- 矩形、多边形创建与编辑。
- 选择、移动、八方向矩形缩放和多边形顶点编辑。
- 标签管理、空间索引、撤销重做。
- 分层 Canvas 2D 渲染和 DPR 高分屏适配。
- 可插拔工具系统，支持自定义工具注册。
- 可主题化的 `<cs-annotator>` 默认界面。

## 环境

- Node.js 22.12+
- Chrome、Edge、Firefox 最近两个大版本
- Safari 17+
- 仅提供 ESM

## 安装

```bash
npm install cs-label-tool
```

## 最简单的使用方式

### 方式一：实例化模式（推荐）

```ts
import { mount, createStandardImageSource } from 'cs-label-tool'

const editor = mount('#app', { historyLimit: 100 })

editor.addLabel({ id: 'person', name: '人物', color: '#ff4d4f' })
editor.addLabel({ id: 'vehicle', name: '车辆', color: '#1677ff' })

await editor.setImage(createStandardImageSource('/images/example.jpg'))
editor.useRect()
```

### 方式二：函数式 API

```ts
import {
  addLabel,
  createStandardImageSource,
  mountAnnotator,
  setImageSource,
} from 'cs-label-tool'

const annotator = mountAnnotator('#app', { historyLimit: 100 })

addLabel(annotator, {
  id: 'person',
  name: '人物',
  color: '#ff4d4f',
})

await setImageSource(
  annotator,
  createStandardImageSource('/images/example.jpg'),
)
```

### 方式三：默认导出 API

```ts
import csLabelTool from 'cs-label-tool'

const annotator = csLabelTool.mount('#app', { historyLimit: 100 })
csLabelTool.addLabel(annotator, { id: 'person', name: '人物', color: '#ff4d4f' })
await csLabelTool.setImage(annotator, csLabelTool.createImageSource('/images/example.jpg'))
```

默认 UI 提供选择、矩形、多边形、放大、缩小、适屏、撤销、重做和标签切换控件。图片加载前，依赖画布的控件会保持禁用。

---

## API 参考

### 一、实例化 API（推荐）

```ts
import { create, mount } from 'cs-label-tool'

// Headless 模式
const editor = create({
  container: document.querySelector('#viewport'),
  historyLimit: 100,
})

// 带 UI 模式
const editor = mount('#app', { historyLimit: 100 })

// 实例方法
editor.addLabel({ id: 'person', name: '人物', color: '#ff4d4f' })
editor.setImage(imageSource)
editor.useRect()
editor.usePolygon()
editor.useSelect()
editor.fitToScreen()
editor.zoomTo(2)
editor.panBy({ x: 100, y: 50 })
editor.undo()
editor.redo()
editor.snapshot()
editor.destroy()
```

### 二、函数式 API

```ts
import { createAnnotator, destroyAnnotator, getSnapshot } from 'cs-label-tool'

// 创建 annotator（headless 模式）
const annotator = createAnnotator({
  container: document.querySelector('#viewport'),
  historyLimit: 100,
})

// 获取当前状态快照
const snapshot = getSnapshot(annotator)
// { schemaVersion, annotations, labels, revision }

// 销毁 annotator（清理 DOM 监听、画布、资源）
destroyAnnotator(annotator)
```

### 二、标注命令

```ts
import {
  addRect,
  addPolygon,
  updateAnnotation,
  removeAnnotation,
  queryAnnotations,
  undo,
  redo,
  canUndo,
  canRedo,
} from 'cs-label-tool'

// 添加矩形标注
const rectId = addRect(annotator, {
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
})

// 添加多边形标注
const polygonId = addPolygon(annotator, {
  labelId: 'person',
  points: [
    [20, 20],
    [120, 20],
    [80, 140],
  ],
})

// 更新标注几何
updateAnnotation(annotator, rectId, {
  type: 'rect',
  x: 120,
  y: 90,
  width: 300,
  height: 500,
})

// 删除标注
removeAnnotation(annotator, polygonId)

// 查询指定区域内的标注
const annotations = queryAnnotations(annotator, {
  x: 0,
  y: 0,
  width: 500,
  height: 500,
})

// 撤销/重做
if (canUndo(annotator)) {
  undo(annotator)
}
if (canRedo(annotator)) {
  redo(annotator)
}
```

### 三、标签管理

```ts
import { addLabel, getActiveLabel, setActiveLabel, updateLabel } from 'cs-label-tool'

// 添加标签
addLabel(annotator, {
  id: 'person',
  name: '人物',
  color: '#ff4d4f',
})

// 获取当前激活的标签
const activeLabelId = getActiveLabel(annotator)

// 设置激活的标签（绘制时使用）
setActiveLabel(annotator, 'person')

// 更新标签（支持动态修改名称和颜色）
updateLabel(annotator, 'person', {
  name: '人类',
  color: '#ff7875',
})
```

### 四、图像与视图

```ts
import {
  createStandardImageSource,
  setImageSource,
  fitToScreen,
  zoomTo,
  zoomBy,
  panBy,
  getZoom,
  hasImage,
  resizeViewport,
  clientToImage,
  imageToClient,
} from 'cs-label-tool'

// 创建图像源（支持 URL / Blob / ImageBitmap）
const imageSource = createStandardImageSource('/images/example.jpg')

// 设置图像源
await setImageSource(annotator, imageSource)

// 检查是否已加载图像
if (hasImage(annotator)) {
  // ...
}

// 视图操作
fitToScreen(annotator)           // 适应屏幕
zoomTo(annotator, 2)             // 缩放到指定倍数
zoomTo(annotator, 2, { x: 100, y: 100 }) // 以指定点为锚点缩放
zoomBy(annotator, 1.25)          // 相对缩放
panBy(annotator, { x: 100, y: 50 }) // 平移

// 获取当前缩放比例
const zoom = getZoom(annotator)

// 窗口大小变化时调用
resizeViewport(annotator)

// 坐标转换
const screenPoint = imageToClient(annotator, { x: 100, y: 100 })
const imagePoint = clientToImage(annotator, { x: 100, y: 100 })
```

### 五、工具系统

```ts
import {
  useSelect,
  useRect,
  usePolygon,
  activateTool,
  activateToolById,
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  listToolsByCategory,
  cancelActiveGesture,
  createToolRegistry,
  type Tool,
  type ToolCategory,
  type KeyboardShortcut,
} from 'cs-label-tool'

// 使用内置工具
useSelect(annotator)           // 选择工具
useRect(annotator)             // 矩形工具（使用当前激活标签）
useRect(annotator, { labelId: 'person' }) // 指定标签
usePolygon(annotator)          // 多边形工具

// 通过 ID 激活工具
activateToolById(annotator, 'select')

// 注册自定义工具
const customTool: Tool = {
  id: 'point-marker',
  name: '点标记',
  description: '在图像上标记单个点',
  icon: '📍',
  cursor: 'crosshair',
  category: 'drawing',
  shortcuts: [{ key: 'm' }],
  handle(input, context) {
    if (input.type === 'down') {
      addRect(context.annotator, {
        labelId: 'other',
        x: input.imagePoint.x - 4,
        y: input.imagePoint.y - 4,
        width: 8,
        height: 8,
      })
    }
  },
  cancel() {},
}

registerTool(annotator, customTool)

// 工具管理
const tool = getTool(annotator, 'point-marker')
const allTools = listTools(annotator)
const drawingTools = listToolsByCategory(annotator, 'drawing')
unregisterTool(annotator, 'point-marker')

// 取消当前手势
cancelActiveGesture(annotator)
```

### 六、选择与编辑

```ts
import {
  selectAnnotation,
  clearSelection,
  getSelection,
  moveRect,
  resizeRect,
  movePolygonVertex,
  removePolygonVertex,
} from 'cs-label-tool'

// 选择标注
selectAnnotation(annotator, annotationId)

// 清除选择
clearSelection(annotator)

// 获取选中的标注 ID 列表
const selectedIds = getSelection(annotator)

// 几何变换工具函数
const movedRect = moveRect(geometry, { x: 10, y: 20 })
const resizedRect = resizeRect(geometry, 'south-east', { x: 200, y: 300 })
const updatedPolygon = movePolygonVertex(geometry, 0, { x: 50, y: 50 })
const removedVertex = removePolygonVertex(geometry, 0)
```

### 七、事件监听

```ts
import { subscribe, type ChangeKind } from 'cs-label-tool'

const unsubscribe = subscribe(annotator, 'change', event => {
  console.log(event.kind, event.revision)
  
  switch (event.kind) {
    case 'annotation:add':
    case 'annotation:remove':
    case 'annotation:update':
      // 标注变化
      break
    case 'label:add':
    case 'label:update':
    case 'label:activate':
      // 标签变化
      break
    case 'history:undo':
    case 'history:redo':
      // 历史操作
      break
    case 'image:load':
    case 'image:clear':
      // 图像变化
      break
  }
})

// 取消订阅
unsubscribe()
```

### 八、Web Component

```ts
import {
  defineAnnotatorElements,
  mountAnnotator,
  unmountAnnotator,
  type CSAnnotatorElement,
} from 'cs-label-tool'

// 方式一：自动挂载
const annotator = mountAnnotator('#app', {
  historyLimit: 100,
})

// 方式二：手动创建
defineAnnotatorElements()
const element = document.createElement('cs-annotator')
document.body.appendChild(element)
const annotator = element.configure({ historyLimit: 100 })

// 卸载
unmountAnnotator('#app')
```

### 九、几何工具函数

```ts
import {
  normalizeRect,
  pointInRect,
  pointInPolygon,
  validatePolygon,
} from 'cs-label-tool'

// 矩形
const rect = normalizeRect({ x: 100, y: 80 }, { x: 50, y: 120 })
const inside = pointInRect({ x: 70, y: 90 }, rect)

// 多边形
const valid = validatePolygon([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 100 },
])
const insidePolygon = pointInPolygon({ x: 50, y: 50 }, [
  [0, 0],
  [100, 0],
  [50, 100],
])
```

### 十、空间索引（高级）

```ts
import {
  createGridIndex,
  insertSpatialItem,
  updateSpatialItem,
  removeSpatialItem,
  querySpatialBounds,
} from 'cs-label-tool'

const index = createGridIndex(512)

insertSpatialItem(index, 'anno-1', { x: 0, y: 0, width: 100, height: 100 })
updateSpatialItem(index, 'anno-1', { x: 50, y: 50, width: 100, height: 100 })
removeSpatialItem(index, 'anno-1')

const visibleIds = querySpatialBounds(index, {
  x: 0,
  y: 0,
  width: 500,
  height: 500,
})
```

---

## 类型定义

### 核心类型

```ts
interface LabelDefinition {
  readonly id: string
  readonly name: string
  readonly color: string
}

interface RectGeometry {
  readonly type: 'rect'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface PolygonGeometry {
  readonly type: 'polygon'
  readonly points: readonly [number, number][]
}

interface Annotation {
  readonly id: string
  readonly labelId: string
  readonly geometry: RectGeometry | PolygonGeometry
  readonly source: 'manual' | 'ai'
  readonly status: 'suggested' | 'accepted' | 'rejected' | 'modified'
  readonly revision: number
  readonly createdAt: number
  readonly updatedAt: number
  readonly metadata: Readonly<Record<string, unknown>>
}

type ToolCategory = 'selection' | 'drawing' | 'navigation' | 'utility'

interface KeyboardShortcut {
  readonly key: string
  readonly ctrl?: boolean
  readonly shift?: boolean
  readonly meta?: boolean
  readonly alt?: boolean
}
```

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `S` | 选择工具 |
| `R` | 矩形工具 |
| `P` | 多边形工具 |
| `+` | 放大 |
| `-` | 缩小 |
| `F` | 适应屏幕 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Delete` | 删除选中标注 |
| `Backspace` | 删除多边形顶点（选中时） |

---

## 开发

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run test:e2e
```

浏览器演示位于 `demo/`。

## 后续里程碑

- 超大图瓦片和金字塔图片源。
- 画笔、橡皮擦、Mask 瓦片和 COCO RLE。
- 可插拔 AI Provider、候选审核、置信度过滤和批量确认。
- COCO/YOLO 导入导出、版本化快照和自动保存回调。

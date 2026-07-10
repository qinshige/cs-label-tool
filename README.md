# cs-label-tool

专为 AI 图像标注软件设计的原生 TypeScript 前端库。无运行时依赖，同时提供函数式 headless 引擎和可选的原生 Web Component UI。

当前里程碑支持：

- 普通图片 URL、`Blob`、`ImageBitmap` 加载。
- 原图坐标系下的缩放、平移、适屏和双向坐标转换。
- 矩形、多边形创建与编辑。
- 选择、移动、八方向矩形缩放和多边形顶点编辑。
- 标签管理、空间索引、撤销重做。
- 分层 Canvas 2D 渲染和 DPR 高分屏适配。
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

默认 UI 提供选择、矩形、多边形、放大、缩小、适屏、撤销、重做和标签切换控件。图片加载前，依赖画布的控件会保持禁用。

## Headless 函数式 API

```ts
import {
  createAnnotator,
  createStandardImageSource,
  fitToScreen,
  getZoom,
  panBy,
  setImageSource,
  usePolygon,
  useRect,
  useSelect,
  zoomBy,
  zoomTo,
} from 'cs-label-tool'

const annotator = createAnnotator({
  container: document.querySelector('#viewport'),
})

await setImageSource(
  annotator,
  createStandardImageSource('/images/example.jpg'),
)

useSelect(annotator)
useRect(annotator, { labelId: 'person' })
usePolygon(annotator, { labelId: 'person' })
fitToScreen(annotator)
zoomTo(annotator, 2)
zoomBy(annotator, 1.25)
console.log(getZoom(annotator))
panBy(annotator, { x: 100, y: 50 })
```

## 程序化标注

```ts
import {
  addPolygon,
  addRect,
  removeAnnotation,
  selectAnnotation,
  updateAnnotation,
} from 'cs-label-tool'

const rectId = addRect(annotator, {
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
})

const polygonId = addPolygon(annotator, {
  labelId: 'person',
  points: [
    { x: 20, y: 20 },
    { x: 120, y: 20 },
    { x: 80, y: 140 },
  ],
})

selectAnnotation(annotator, rectId)
updateAnnotation(annotator, rectId, {
  type: 'rect',
  x: 120,
  y: 90,
  width: 300,
  height: 500,
})
removeAnnotation(annotator, polygonId)
```

选择工具激活后，`Delete` 删除当前标注；选中多边形顶点后，`Backspace` 删除该顶点（多边形始终至少保留 3 个有效顶点）。

## 事件和生命周期

```ts
import {
  destroyAnnotator,
  getSnapshot,
  redo,
  subscribe,
  undo,
} from 'cs-label-tool'

const unsubscribe = subscribe(annotator, 'change', event => {
  console.log(event.kind, event.revision, getSnapshot(annotator))
})

undo(annotator)
redo(annotator)
unsubscribe()
destroyAnnotator(annotator)
```

所有持久化几何均使用原图像素坐标。缩放、平移、Canvas 尺寸和 `devicePixelRatio` 只影响显示，不修改标注数据。

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

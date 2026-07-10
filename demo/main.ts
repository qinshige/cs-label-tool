import {
  addLabel,
  createStandardImageSource,
  defineAnnotatorElements,
  fitToScreen,
  getSnapshot,
  redo,
  setImageSource,
  subscribe,
  undo,
  usePolygon,
  useRect,
  useSelect,
  zoomBy,
  type CSAnnotatorElement,
} from '../src/index.js'

// -- register custom element & init annotator --
defineAnnotatorElements()
const element = document.querySelector<CSAnnotatorElement>('#annotator')!
const annotator = element.configure({ historyLimit: 100 })

// -- labels --
addLabel(annotator, { id: 'person', name: '人物', color: '#ff4d4f' })
addLabel(annotator, { id: 'vehicle', name: '车辆', color: '#1677ff' })
addLabel(annotator, { id: 'animal', name: '动物', color: '#52c41a' })
addLabel(annotator, { id: 'building', name: '建筑', color: '#faad14' })
addLabel(annotator, { id: 'other', name: '其他', color: '#722ed1' })

// -- stats --
const countEl = document.getElementById('anno-count')!
subscribe(annotator, 'change', () => {
  countEl.textContent = String(getSnapshot(annotator).annotations.length)
})

// -- toast helper --
let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(msg: string): void {
  const el = document.getElementById('toast')!
  el.textContent = msg
  el.classList.add('show')
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 1500)
}

// -- keyboard shortcuts --
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()

  if (mod && key === 'z') {
    e.preventDefault()
    undo(annotator) && toast('撤销')
    return
  }
  if (mod && key === 'y') {
    e.preventDefault()
    redo(annotator) && toast('重做')
    return
  }

  switch (key) {
    case 's': useSelect(annotator); toast('选择工具'); break
    case 'r': useRect(annotator); toast('矩形工具'); break
    case 'p': usePolygon(annotator); toast('多边形工具'); break
    case '=':
    case '+': zoomBy(annotator, 1.25); break
    case '-': zoomBy(annotator, 0.8); break
    case 'f': fitToScreen(annotator); toast('适应屏幕'); break
    case 'delete':
    case 'backspace': {
      // Select tool handles Delete natively, no extra logic needed here
      break
    }
  }
})

// -- load demo image --
try {
  await setImageSource(
    annotator,
    createStandardImageSource('../a.webp'),
  )
  fitToScreen(annotator)
  toast('图像加载完成')
} catch {
  // Fallback: try a public demo image
  try {
    await setImageSource(
      annotator,
      createStandardImageSource(
        'https://picsum.photos/seed/cs-label-demo/1200/800',
      ),
    )
    fitToScreen(annotator)
    toast('已加载在线演示图像')
  } catch {
    toast('无法加载图像，请手动拖入图片或配置 a.webp')
  }
}

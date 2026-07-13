import {
  addLabel,
  addMask,
  addPolygon,
  addRect,
  canRedo,
  canUndo,
  clearSelection,
  createBrushTool,
  createEraserTool,
  createStandardImageSource,
  defineAnnotatorElements,
  fitToScreen,
  getActiveLabel,
  getSelection,
  getSnapshot,
  getZoom,
  hasImage,
  imageToClient,
  listTools,
  redo,
  registerTool,
  removeAnnotation,
  selectAnnotation,
  setActiveLabel,
  setImageSource,
  subscribe,
  undo,
  updateAnnotation,
  updateAnnotationLabel,
  updateLabel,
  useBrush,
  useEraser,
  usePolygon,
  useRect,
  useSelect,
  zoomBy,
  type CSAnnotatorElement,
  type Tool,
  type ToolContext,
  type NormalizedPointerInput,
} from '../src/index.js'

defineAnnotatorElements()
const element = document.querySelector<CSAnnotatorElement>('#annotator')!
const annotator = element.configure({ historyLimit: 100 })

const labels = [
  { id: 'person', name: '人物', color: '#ff4d4f' },
  { id: 'vehicle', name: '车辆', color: '#1677ff' },
  { id: 'animal', name: '动物', color: '#52c41a' },
  { id: 'building', name: '建筑', color: '#faad14' },
  { id: 'other', name: '其他', color: '#722ed1' },
]

labels.forEach(label => addLabel(annotator, label))
setActiveLabel(annotator, 'person')

const countEl = document.getElementById('anno-count')!
const currentLabelBadge = document.getElementById('current-label')!
const currentLabelText = document.getElementById('current-label-text')!
const zoomLevelEl = document.getElementById('zoom-level')!
const selectedInfoEl = document.getElementById('selected-info')!
const annotationListEl = document.getElementById('annotation-list')!
const statsEl = document.getElementById('stats')!
const btnUndo = document.getElementById('btn-undo')! as HTMLButtonElement
const btnRedo = document.getElementById('btn-redo')! as HTMLButtonElement

function updateStats(): void {
  const snapshot = getSnapshot(annotator)
  countEl.textContent = String(snapshot.annotations.length)
  
  const activeLabelId = getActiveLabel(annotator)
  const activeLabel = snapshot.labels.find(l => l.id === activeLabelId)
  if (activeLabel) {
    currentLabelBadge.style.backgroundColor = activeLabel.color
    currentLabelText.textContent = activeLabel.name
  }
  
  zoomLevelEl.textContent = hasImage(annotator)
    ? `${Math.round(getZoom(annotator) * 100)}%`
    : '--'
  
  btnUndo.disabled = !canUndo(annotator)
  btnRedo.disabled = !canRedo(annotator)
  
  const selectedIds = getSelection(annotator)
  if (selectedIds.length > 0) {
    const selected = snapshot.annotations.find(a => a.id === selectedIds[0])
    if (selected) {
      const label = snapshot.labels.find(l => l.id === selected.labelId)
      selectedInfoEl.innerHTML = `
        <div class="info-row"><span>ID</span><span>${selected.id.slice(0, 8)}...</span></div>
        <div class="info-row"><span>标签</span><span style="color: ${label?.color}">${label?.name}</span></div>
        <div class="info-row"><span>类型</span><span>${selected.geometry.type === 'rect' ? '矩形' : selected.geometry.type === 'polygon' ? '多边形' : 'Mask'}</span></div>
        <div class="info-row"><span>操作</span><div style="display:flex;gap:4px;">
          <button class="mini-btn" onclick="window._changeSelectedLabel()">改标签</button>
          <button class="mini-btn danger" onclick="window._deleteSelected()">删除</button>
        </div></div>
      `
    }
  } else {
    selectedInfoEl.innerHTML = '<div class="info-empty">未选择标注</div>'
  }
  
  const labelStats: Record<string, number> = {}
  snapshot.annotations.forEach(a => {
    labelStats[a.labelId] = (labelStats[a.labelId] || 0) + 1
  })
  statsEl.innerHTML = snapshot.labels.map(l => `
    <div class="stat-item">
      <span class="stat-color" style="background-color: ${l.color}"></span>
      <span class="stat-name">${l.name}</span>
      <span class="stat-count">${labelStats[l.id] || 0}</span>
    </div>
  `).join('')
  
  annotationListEl.innerHTML = snapshot.annotations.length === 0 
    ? '<div class="list-empty">暂无标注</div>'
    : snapshot.annotations.map((a, i) => {
        const label = snapshot.labels.find(l => l.id === a.labelId)
        const isSelected = getSelection(annotator).includes(a.id)
        return `
          <div class="anno-item ${isSelected ? 'selected' : ''}" onclick="window._selectAnnotationById('${a.id}')">
            <span class="anno-index">${i + 1}</span>
            <span class="anno-color" style="background-color: ${label?.color}"></span>
            <span class="anno-label">${label?.name}</span>
            <span class="anno-type">${a.geometry.type === 'rect' ? '矩形' : a.geometry.type === 'polygon' ? '多边形' : '涂抹'}</span>
            <button class="anno-delete" onclick="event.stopPropagation(); window._removeAnnotationById('${a.id}')">×</button>
          </div>
        `
      }).join('')
}

subscribe(annotator, 'change', updateStats)
updateStats()

let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(msg: string): void {
  const el = document.getElementById('toast')!
  el.textContent = msg
  el.classList.add('show')
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 1500)
}

let currentToolId: string = 'select'
let brushSize = 16

function activateCurrentBrush(): void {
  useBrush(annotator, { size: brushSize })
}

function syncToolList(): void {
  const tools = listTools(annotator)
  const listEl = document.getElementById('tool-list')!
  listEl.innerHTML = tools.map(tool => `
    <button class="tool-btn ${tool.id === currentToolId ? 'active' : ''}" data-tool-id="${tool.id}" title="${tool.description ?? ''}">
      ${tool.icon ?? ''} ${tool.name}
    </button>
  `).join('')

  listEl.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const toolId = btn.getAttribute('data-tool-id')!
      currentToolId = toolId
      if (toolId !== 'select') {
        clearSelection(annotator)
      }
      if (toolId === 'select') { useSelect(annotator); toast('选择工具') }
      else if (toolId === 'rect') { useRect(annotator); toast('矩形工具') }
      else if (toolId === 'polygon') { usePolygon(annotator); toast('多边形工具') }
      else if (toolId === 'brush') { activateCurrentBrush(); toast(`涂抹工具 · ${brushSize}px`) }
      else if (toolId === 'eraser') { useEraser(annotator); toast('橡皮擦工具') }
      else if (toolId === 'point-marker') { useSelect(annotator); toast('点标记工具') }
      syncToolList()
    })
  })
}

function syncLabelSelection(): void {
  const listEl = document.getElementById('label-selection')!
  const activeLabelId = getActiveLabel(annotator)
  listEl.innerHTML = labels.map(label => {
    const isActive = label.id === activeLabelId
    return `
      <button class="label-btn ${isActive ? 'active' : ''}" data-label-id="${label.id}" style="--label-color: ${label.color}">
        <span class="label-color" style="background-color: ${label.color}"></span>
        <span class="label-name">${label.name}</span>
      </button>
    `
  }).join('')

  listEl.querySelectorAll('.label-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const labelId = btn.getAttribute('data-label-id')!
      setActiveLabel(annotator, labelId)
      const label = labels.find(l => l.id === labelId)
      toast(`已选择标签: ${label?.name}`)
      syncLabelSelection()
    })
  })
}

function syncLabelColors(): void {
  const labelList = getSnapshot(annotator).labels
  const listEl = document.getElementById('label-color-list')!
  listEl.innerHTML = labelList.map(label => `
    <div class="label-color-item">
      <input type="color" data-label-id="${label.id}" value="${label.color}" />
      <span class="label-color-name">${label.name}</span>
    </div>
  `).join('')

  listEl.querySelectorAll('input[type="color"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      updateLabel(annotator, target.getAttribute('data-label-id')!, { color: target.value })
      syncLabelSelection()
    })
  })
}

const pointMarkerTool: Tool = {
  id: 'point-marker',
  name: '点标记',
  description: '在图像上标记单个点',
  icon: '📍',
  cursor: 'crosshair',
  category: 'drawing',
  handle(input: NormalizedPointerInput, context: ToolContext) {
    if (input.type === 'down') {
      const { x, y } = input.imagePoint
      addRect(context.annotator, {
        labelId: getActiveLabel(context.annotator) || 'other',
        x: x - 4, y: y - 4, width: 8, height: 8,
      })
    }
  },
  cancel() {},
}

registerTool(annotator, pointMarkerTool)
syncToolList()
syncLabelSelection()
subscribe(annotator, 'change', syncLabelColors)
syncLabelColors()

const brushSizeInput = document.getElementById('brush-size') as HTMLInputElement
const brushSizeValue = document.getElementById('brush-size-value')!
brushSizeInput.addEventListener('input', () => {
  brushSize = Number(brushSizeInput.value)
  brushSizeValue.textContent = `${brushSize} px`
  if (currentToolId === 'brush') {
    activateCurrentBrush()
  }
})

;(window as any)._selectAnnotationById = (id: string) => {
  currentToolId = 'select'
  useSelect(annotator)
  selectAnnotation(annotator, id)
  syncToolList()
  toast('已选中')
}

(window as any)._removeAnnotationById = (id: string) => {
  removeAnnotation(annotator, id)
  toast('已删除')
}

(window as any)._changeSelectedLabel = () => {
  const selected = getSelection(annotator)
  if (selected.length === 0) return
  
  const labelNames = labels.map(l => l.name).join(', ')
  const newName = prompt(`输入新标签名称 (可选: ${labelNames}):`)
  if (!newName) return
  
  const label = labels.find(l => l.name === newName || l.id === newName)
  if (label) {
    selected.forEach(id => {
      updateAnnotationLabel(annotator, id, label.id)
    })
    toast(`已修改标签为: ${label.name}`)
  } else {
    toast('标签不存在')
  }
}

(window as any)._deleteSelected = () => {
  const selected = getSelection(annotator)
  if (selected.length > 0) {
    selected.forEach(id => removeAnnotation(annotator, id))
    toast(`已删除 ${selected.length} 个标注`)
  }
}

function exportAnnotations(): void {
  const data = JSON.stringify(getSnapshot(annotator), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `annotations-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('标注数据已导出')
}

function importAnnotations(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (data.annotations) {
        data.annotations.forEach((anno: any) => {
          if (anno.geometry.type === 'rect') {
            addRect(annotator, {
              labelId: anno.labelId,
              x: anno.geometry.x, y: anno.geometry.y,
              width: anno.geometry.width, height: anno.geometry.height,
            })
          } else if (anno.geometry.type === 'polygon') {
            addPolygon(annotator, {
              labelId: anno.labelId,
              points: anno.geometry.points.map((p: number[]) => ({ x: p[0], y: p[1] })),
            })
          } else if (anno.geometry.type === 'mask') {
            addMask(annotator, {
              labelId: anno.labelId,
              width: anno.geometry.width,
              height: anno.geometry.height,
              rle: anno.geometry.rle,
            })
          }
        })
        toast(`已导入 ${data.annotations.length} 个标注`)
      }
    } catch {
      toast('导入失败')
    }
  }
  input.click()
}

function clearAllAnnotations(): void {
  if (confirm('确定清空所有标注？')) {
    getSnapshot(annotator).annotations.forEach(a => removeAnnotation(annotator, a.id))
    toast('已清空')
  }
}

async function loadImageFromFile(file: File): Promise<void> {
  try {
    await setImageSource(annotator, createStandardImageSource(URL.createObjectURL(file)))
    fitToScreen(annotator)
    toast(`已加载: ${file.name}`)
  } catch {
    toast('图片加载失败')
  }
}

function selectImage(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) loadImageFromFile(file)
  }
  input.click()
}

element.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'copy' })
element.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer!.files[0]
  if (file?.type.startsWith('image/')) loadImageFromFile(file)
})

btnUndo.addEventListener('click', () => { undo(annotator) && toast('撤销') })
btnRedo.addEventListener('click', () => { redo(annotator) && toast('重做') })
document.getElementById('btn-zoom-in')!.addEventListener('click', () => { zoomBy(annotator, 1.25) })
document.getElementById('btn-zoom-out')!.addEventListener('click', () => { zoomBy(annotator, 0.8) })
document.getElementById('btn-fit')!.addEventListener('click', () => { fitToScreen(annotator); toast('适应屏幕') })
document.getElementById('btn-export')!.addEventListener('click', exportAnnotations)
document.getElementById('btn-import')!.addEventListener('click', importAnnotations)
document.getElementById('btn-clear')!.addEventListener('click', clearAllAnnotations)
document.getElementById('btn-select-image')!.addEventListener('click', selectImage)

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 'z') { e.preventDefault(); undo(annotator) && toast('撤销'); return }
  if (mod && key === 'y') { e.preventDefault(); redo(annotator) && toast('重做'); return }
  switch (key) {
    case '=': case '+': zoomBy(annotator, 1.25); break
    case '-': zoomBy(annotator, 0.8); break
    case 'f': fitToScreen(annotator); toast('适应屏幕'); break
    case 'delete': case 'backspace':
      const selected = getSelection(annotator)
      if (selected.length > 0) {
        selected.forEach(id => removeAnnotation(annotator, id))
        toast(`已删除 ${selected.length} 个标注`)
      }
      break
  }
})

try {
  await setImageSource(annotator, createStandardImageSource('../a.webp'))
  fitToScreen(annotator)
  toast('图像加载完成')
} catch {
  try {
    await setImageSource(annotator, createStandardImageSource('https://picsum.photos/seed/cs-label-demo/1200/800'))
    fitToScreen(annotator)
    toast('已加载在线演示图像')
  } catch {
    toast('无法加载图像，请手动拖入')
  }
}

;(window as any).demoTest = {
  addRect(labelId: string, bounds: { x: number; y: number; width: number; height: number }) {
    return addRect(annotator, { labelId, ...bounds })
  },
  snapshot() {
    return getSnapshot(annotator)
  },
  selection() {
    return getSelection(annotator)
  },
  imageToClient(point: { x: number; y: number }) {
    return imageToClient(annotator, point)
  },
  hasImagePixels() {
    const canvas = element.shadowRoot?.querySelector<HTMLCanvasElement>(
      'canvas[data-layer="image"]',
    )
    const context = canvas?.getContext('2d')
    if (canvas == null || context == null) {
      return false
    }
    for (let y = 0; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 12))) {
      for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 12))) {
        const data = context.getImageData(x, y, 1, 1).data
        if ((data[3] ?? 0) > 0) {
          return true
        }
      }
    }
    return false
  },
}
await new Promise<void>(resolve => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve())
  })
})
document.documentElement.dataset.ready = 'true'

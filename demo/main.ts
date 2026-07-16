import {
  addLabel,
  addMask,
  addEllipse,
  addPoint,
  addPolygon,
  addPolyline,
  addRect,
  bringForward,
  bringToFront,
  canRedo,
  canUndo,
  clearSelection,
  clearImageClassification,
  copyAnnotations,
  createStandardImageSource,
  defineAnnotatorElements,
  fitToScreen,
  getActiveLabel,
  getSelection,
  getImageClassification,
  getSnapshot,
  getZoom,
  hasImage,
  imageToClient,
  listTools,
  redo,
  duplicateAnnotations,
  groupAnnotations,
  pasteAnnotations,
  removeAnnotations,
  removeAnnotation,
  selectAnnotations,
  setAnnotationsHidden,
  setAnnotationsLocked,
  setClassificationOptions,
  setImageClassification,
  sendBackward,
  sendToBack,
  setActiveLabel,
  setImageSource,
  subscribe,
  toggleAnnotationSelection,
  undo,
  updateAnnotationLabel,
  ungroupAnnotations,
  updateLabel,
  useBrush,
  useEllipse,
  useEraser,
  useFreehand,
  useLasso,
  usePoint,
  usePolygon,
  usePolyline,
  useRect,
  useSelect,
  zoomBy,
  type CSAnnotatorElement,
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

const classifications = [
  { id: 'normal', name: '正常', color: '#22c55e' },
  { id: 'abnormal', name: '异常', color: '#ef4444' },
  { id: 'review', name: '待复核', color: '#f59e0b' },
]
setClassificationOptions(annotator, classifications)

const countEl = document.getElementById('anno-count')!
const currentLabelBadge = document.getElementById('current-label')!
const currentLabelText = document.getElementById('current-label-text')!
const zoomLevelEl = document.getElementById('zoom-level')!
const selectedInfoEl = document.getElementById('selected-info')!
const annotationListEl = document.getElementById('annotation-list')!
const statsEl = document.getElementById('stats')!
const btnUndo = document.getElementById('btn-undo')! as HTMLButtonElement
const btnRedo = document.getElementById('btn-redo')! as HTMLButtonElement
const snapshotDialog = document.getElementById('snapshot-dialog')! as HTMLDialogElement
const snapshotJsonEl = document.getElementById('snapshot-json')!
let displayedSnapshotJson = ''

function geometryTypeName(type: string): string {
  return ({
    rect: '矩形',
    polygon: '多边形',
    mask: '涂抹',
    point: '点',
    polyline: '折线',
    ellipse: '椭圆',
  } as Record<string, string>)[type] ?? type
}

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
      const rotationInfo = selected.geometry.type === 'rect' || selected.geometry.type === 'ellipse'
        ? `<div class="info-row"><span>角度</span><span>${Math.round((selected.geometry.rotation ?? 0) * 10) / 10}°</span></div>`
        : ''
      selectedInfoEl.innerHTML = `
        <div class="info-row"><span>已选</span><span>${selectedIds.length} 个</span></div>
        <div class="info-row"><span>ID</span><span>${selected.id.slice(0, 8)}...</span></div>
        <div class="info-row"><span>标签</span><span style="color: ${label?.color}">${label?.name}</span></div>
        <div class="info-row"><span>类型</span><span>${geometryTypeName(selected.geometry.type)}</span></div>
        <div class="info-row"><span>分组</span><span>${selected.groupId?.slice(0, 8) ?? '未分组'}</span></div>
        <div class="info-row"><span>状态</span><span>${selected.locked ? '已锁定' : '可编辑'}${selected.hidden ? ' · 已隐藏' : ''}</span></div>
        ${rotationInfo}
        <div class="batch-actions">
          <button class="mini-btn" onclick="window._groupSelected()">分组</button>
          <button class="mini-btn" onclick="window._ungroupSelected()">解组</button>
          <button class="mini-btn" onclick="window._duplicateSelected()">克隆</button>
          <button class="mini-btn" onclick="window._copySelected()">复制</button>
          <button class="mini-btn" onclick="window._pasteSelected()">粘贴</button>
          <button class="mini-btn" onclick="window._changeSelectedLabel()">改标签</button>
          <button class="mini-btn" onclick="window._lockSelected(true)">锁定</button>
          <button class="mini-btn" onclick="window._lockSelected(false)">解锁</button>
          <button class="mini-btn" onclick="window._hideSelected(true)">隐藏</button>
          <button class="mini-btn" onclick="window._hideSelected(false)">显示</button>
          <button class="mini-btn" onclick="window._arrangeSelected('front')">置顶</button>
          <button class="mini-btn" onclick="window._arrangeSelected('forward')">上移</button>
          <button class="mini-btn" onclick="window._arrangeSelected('backward')">下移</button>
          <button class="mini-btn" onclick="window._arrangeSelected('back')">置底</button>
          <button class="mini-btn danger" onclick="window._deleteSelected()">删除</button>
        </div>
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
          <div class="anno-item ${isSelected ? 'selected' : ''} ${a.hidden ? 'hidden' : ''}" onclick="window._selectAnnotationById('${a.id}', event)">
            <span class="anno-index">${i + 1}</span>
            <span class="anno-color" style="background-color: ${label?.color}"></span>
            <span class="anno-label">${label?.name}</span>
            <span class="anno-type">${geometryTypeName(a.geometry.type)}</span>
            <span class="anno-actions">
              <button class="anno-action" title="${a.locked ? '解锁' : '锁定'}" onclick="event.stopPropagation(); window._toggleLocked('${a.id}', ${!a.locked})">${a.locked ? '🔒' : '🔓'}</button>
              <button class="anno-action" title="${a.hidden ? '显示' : '隐藏'}" onclick="event.stopPropagation(); window._toggleHidden('${a.id}', ${!a.hidden})">${a.hidden ? '◌' : '◉'}</button>
              <button class="anno-delete" title="删除" onclick="event.stopPropagation(); window._removeAnnotationById('${a.id}')">×</button>
            </span>
          </div>
        `
      }).join('')
}

function syncClassification(): void {
  const current = getImageClassification(annotator)
  const list = document.getElementById('classification-list')!
  list.innerHTML = `
    <button class="classification-btn ${current === null ? 'active' : ''}" data-id="">
      <span class="classification-dot" style="background:#64748b"></span>未分类
    </button>
    ${classifications.map(option => `
      <button class="classification-btn ${current === option.id ? 'active' : ''}" data-id="${option.id}">
        <span class="classification-dot" style="background:${option.color}"></span>${option.name}
      </button>
    `).join('')}
  `
  list.querySelectorAll<HTMLButtonElement>('.classification-btn').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id ?? ''
      if (id === '') clearImageClassification(annotator)
      else setImageClassification(annotator, id)
    })
  })
}

subscribe(annotator, 'change', updateStats)
subscribe(annotator, 'change', syncClassification)
updateStats()
syncClassification()

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
  // Demo 默认展示标注工具；套索选择仍保留在公共 API 中供业务方按需使用。
  const tools = listTools(annotator).filter(tool => tool.id !== 'lasso')
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
      if (toolId !== 'select' && toolId !== 'lasso') {
        clearSelection(annotator)
      }
      if (toolId === 'select') { useSelect(annotator); toast('选择工具') }
      else if (toolId === 'lasso') { useLasso(annotator); toast('套索工具') }
      else if (toolId === 'freehand') { useFreehand(annotator); toast('自由轮廓工具') }
      else if (toolId === 'point') { usePoint(annotator); toast('点工具') }
      else if (toolId === 'rect') { useRect(annotator); toast('矩形工具') }
      else if (toolId === 'ellipse') { useEllipse(annotator); toast('椭圆工具 · Shift 绘制正圆') }
      else if (toolId === 'polyline') { usePolyline(annotator); toast('折线工具') }
      else if (toolId === 'polygon') { usePolygon(annotator); toast('多边形工具') }
      else if (toolId === 'brush') { activateCurrentBrush(); toast(`涂抹工具 · ${brushSize}px`) }
      else if (toolId === 'eraser') { useEraser(annotator); toast('橡皮擦工具') }
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

;(window as any)._selectAnnotationById = (id: string, event: MouseEvent) => {
  currentToolId = 'select'
  useSelect(annotator)
  if (event.shiftKey) {
    toggleAnnotationSelection(annotator, id, { expandGroups: !event.altKey })
  } else {
    selectAnnotations(annotator, [id], { expandGroups: !event.altKey })
  }
  syncToolList()
  toast('已选中')
}

(window as any)._removeAnnotationById = (id: string) => {
  try {
    removeAnnotation(annotator, id)
    toast('已删除')
  } catch {
    toast('标注已锁定，不能删除')
  }
}

;(window as any)._toggleLocked = (id: string, locked: boolean) => {
  setAnnotationsLocked(annotator, [id], locked)
}

;(window as any)._toggleHidden = (id: string, hidden: boolean) => {
  const changed = setAnnotationsHidden(annotator, [id], hidden)
  if (changed === 0) toast('请先解锁标注')
}

;(window as any)._groupSelected = () => {
  const id = groupAnnotations(annotator, getSelection(annotator))
  toast(id ? '已分组' : '至少选择两个未锁定标注')
}

;(window as any)._ungroupSelected = () => {
  toast(`已取消 ${ungroupAnnotations(annotator, getSelection(annotator))} 个分组成员`)
}

;(window as any)._copySelected = () => {
  toast(`已复制 ${copyAnnotations(annotator, getSelection(annotator))} 个标注`)
}

;(window as any)._pasteSelected = () => {
  toast(`已粘贴 ${pasteAnnotations(annotator).length} 个标注`)
}

;(window as any)._duplicateSelected = () => {
  toast(`已克隆 ${duplicateAnnotations(annotator, getSelection(annotator)).length} 个标注`)
}

;(window as any)._lockSelected = (locked: boolean) => {
  const changed = setAnnotationsLocked(annotator, getSelection(annotator), locked)
  toast(`${locked ? '锁定' : '解锁'}了 ${changed} 个标注`)
}

;(window as any)._hideSelected = (hidden: boolean) => {
  const changed = setAnnotationsHidden(annotator, getSelection(annotator), hidden)
  toast(`${hidden ? '隐藏' : '显示'}了 ${changed} 个标注`)
}

;(window as any)._arrangeSelected = (
  mode: 'front' | 'forward' | 'backward' | 'back',
) => {
  const selected = getSelection(annotator)
  const changed = mode === 'front'
    ? bringToFront(annotator, selected)
    : mode === 'forward'
      ? bringForward(annotator, selected)
      : mode === 'backward'
        ? sendBackward(annotator, selected)
        : sendToBack(annotator, selected)
  toast(`已调整 ${changed} 个标注的图层`)
}

(window as any)._changeSelectedLabel = () => {
  const selected = getSelection(annotator)
  if (selected.length === 0) return
  
  const labelNames = labels.map(l => l.name).join(', ')
  const newName = prompt(`输入新标签名称 (可选: ${labelNames}):`)
  if (!newName) return
  
  const label = labels.find(l => l.name === newName || l.id === newName)
  if (label) {
    let changed = 0
    selected.forEach(id => {
      try {
        updateAnnotationLabel(annotator, id, label.id)
        changed += 1
      } catch {}
    })
    toast(`已将 ${changed} 个标注改为: ${label.name}`)
  } else {
    toast('标签不存在')
  }
}

(window as any)._deleteSelected = () => {
  const selected = getSelection(annotator)
  if (selected.length > 0) {
    toast(`已删除 ${removeAnnotations(annotator, selected)} 个标注`)
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

function showSnapshotDialog(): void {
  displayedSnapshotJson = JSON.stringify(getSnapshot(annotator), null, 2)
  snapshotJsonEl.textContent = displayedSnapshotJson
  snapshotDialog.showModal()
}

async function copySnapshotJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(displayedSnapshotJson)
    toast('标注结果已复制')
  } catch {
    toast('复制失败，请手动选择 JSON')
  }
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
        const imported = new Map<string, string>()
        data.annotations.forEach((anno: any) => {
          let newId: string | null = null
          if (anno.geometry.type === 'rect') {
            newId = addRect(annotator, {
              labelId: anno.labelId,
              x: anno.geometry.x, y: anno.geometry.y,
              width: anno.geometry.width, height: anno.geometry.height,
              ...(anno.geometry.rotation === undefined
                ? {}
                : { rotation: anno.geometry.rotation }),
            })
          } else if (anno.geometry.type === 'polygon') {
            newId = addPolygon(annotator, {
              labelId: anno.labelId,
              points: anno.geometry.points.map((p: number[]) => ({ x: p[0], y: p[1] })),
            })
          } else if (anno.geometry.type === 'mask') {
            newId = addMask(annotator, {
              labelId: anno.labelId,
              width: anno.geometry.width,
              height: anno.geometry.height,
              rle: anno.geometry.rle,
            })
          } else if (anno.geometry.type === 'point') {
            newId = addPoint(annotator, {
              labelId: anno.labelId,
              x: anno.geometry.x,
              y: anno.geometry.y,
            })
          } else if (anno.geometry.type === 'polyline') {
            newId = addPolyline(annotator, {
              labelId: anno.labelId,
              points: anno.geometry.points.map((p: number[]) => ({ x: p[0], y: p[1] })),
            })
          } else if (anno.geometry.type === 'ellipse') {
            newId = addEllipse(annotator, {
              labelId: anno.labelId,
              cx: anno.geometry.cx,
              cy: anno.geometry.cy,
              radiusX: anno.geometry.radiusX,
              radiusY: anno.geometry.radiusY,
              ...(anno.geometry.rotation === undefined ? {} : { rotation: anno.geometry.rotation }),
            })
          }
          if (newId !== null) {
            imported.set(anno.id, newId)
          }
        })
        const groups = new Map<string, string[]>()
        data.annotations.forEach((anno: any) => {
          const newId = imported.get(anno.id)
          if (newId === undefined) return
          if (anno.groupId) {
            groups.set(anno.groupId, [...(groups.get(anno.groupId) ?? []), newId])
          }
        })
        groups.forEach(ids => groupAnnotations(annotator, ids))
        data.annotations.forEach((anno: any) => {
          const newId = imported.get(anno.id)
          if (newId === undefined) return
          if (anno.hidden) setAnnotationsHidden(annotator, [newId], true)
          if (anno.locked) setAnnotationsLocked(annotator, [newId], true)
        })
        if (Array.isArray(data.classificationOptions)) {
          setClassificationOptions(annotator, data.classificationOptions)
          if (data.classificationId) {
            setImageClassification(annotator, data.classificationId)
          }
        }
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
    const snapshot = getSnapshot(annotator)
    const locked = snapshot.annotations.filter(item => item.locked).map(item => item.id)
    if (locked.length > 0) setAnnotationsLocked(annotator, locked, false)
    removeAnnotations(annotator, snapshot.annotations.map(item => item.id))
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
document.getElementById('btn-get-result')!.addEventListener('click', showSnapshotDialog)
document.getElementById('btn-import')!.addEventListener('click', importAnnotations)
document.getElementById('btn-clear')!.addEventListener('click', clearAllAnnotations)
document.getElementById('btn-select-image')!.addEventListener('click', selectImage)
document.getElementById('btn-copy-snapshot')!.addEventListener('click', copySnapshotJson)
document.getElementById('btn-close-snapshot')!.addEventListener('click', () => snapshotDialog.close())
document.getElementById('btn-dismiss-snapshot')!.addEventListener('click', () => snapshotDialog.close())

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 'z') { e.preventDefault(); undo(annotator) && toast('撤销'); return }
  if (mod && key === 'y') { e.preventDefault(); redo(annotator) && toast('重做'); return }
  // Ctrl+C/V/D 由选择工具内部 handleKey 处理，此处不再重复绑定
  switch (key) {
    case '=': case '+': zoomBy(annotator, 1.25); break
    case '-': zoomBy(annotator, 0.8); break
    case 'f': fitToScreen(annotator); toast('适应屏幕'); break
    case 'delete': case 'backspace':
      const selected = getSelection(annotator)
      if (selected.length > 0) {
        toast(`已删除 ${removeAnnotations(annotator, selected)} 个标注`)
      }
      break
  }
})

try {
  await setImageSource(annotator, createStandardImageSource(new URL('../a.webp', import.meta.url).href))
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
  useLasso() {
    useLasso(annotator)
  },
  addRect(labelId: string, bounds: { x: number; y: number; width: number; height: number }) {
    return addRect(annotator, { labelId, ...bounds })
  },
  addPoint(labelId: string, point: { x: number; y: number }) {
    return addPoint(annotator, { labelId, ...point })
  },
  addEllipse(labelId: string, geometry: {
    cx: number
    cy: number
    radiusX: number
    radiusY: number
    rotation?: number
  }) {
    return addEllipse(annotator, { labelId, ...geometry })
  },
  select(ids: string[], expandGroups = true) {
    return selectAnnotations(annotator, ids, { expandGroups })
  },
  group(ids: string[]) {
    return groupAnnotations(annotator, ids)
  },
  lock(ids: string[], locked: boolean) {
    return setAnnotationsLocked(annotator, ids, locked)
  },
  zoom(scale: number) {
    const current = getZoom(annotator)
    zoomBy(annotator, scale / current)
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

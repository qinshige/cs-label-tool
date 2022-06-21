import Compiler from '../js/compiler.js'
import vm from '../js/vnode.js'
const compiler = new Compiler()
const el = new vm()
// newly
import CSLabelRect from './graphics/rect.js'
const csLabelRect = new CSLabelRect()
import CSLabelMask from './graphics/mask.js'
const csLabelMask = new CSLabelMask()

// 设置虚拟DOM 创建结构
function CreateStructure() {
  const img = new Image()
  img.src = `../a.webp`
  img.onload = () => {
    this.width = img.width
    this.height = img.width
    this.src = img.src
    this.vm = el.h(this) // 初始化实例  图形
    compiler.Render(this.vm, document.body)
  }
}
// 鼠标开始绘制
CreateStructure.prototype.drawMousedown = function (e) {
  this.startDraw = true
  switch (window.type) {
    case 'rect':
      csLabelRect.drawRectMousedow(e)
      break
    case 'mask':
      console.log(this.offsetWidth)
      csLabelMask.drawMaskMousedow(e, {
        width: this.offsetWidth,
        height: this.offsetHeight,
      })
      break
  }
}
// 鼠标移动
CreateStructure.prototype.drawMousemove = function (e) {
  if (this.startDraw) {
    switch (window.type) {
      case 'rect':
        csLabelRect.drawRectMousemove(e)
        break
      case 'mask':
        csLabelMask.drawMaskMousemove(e)
        break
    }
  }
}
// 绘制结束
CreateStructure.prototype.drawMouseup = function (e) {
  this.startDraw = false
  switch (window.type) {
    case 'rect':
      csLabelRect.drawRectMouseup(e)
      break
    case 'mask':
      csLabelMask.drawMaskMouseup(e)
      break
  }
}
// 键盘事件
window.onkeydown = function (e) {
  console.log(e)
  if (e.code === 'AltLeft') {
    document.getElementById('svg_draw_layer').style.pointerEvents = 'none'
    csLabelRect.editDrawType = false
    csLabelMask.editDrawType = false
  }
}
window.onkeyup = function (e) {
  document.getElementById('svg_draw_layer').style.pointerEvents = ''
  csLabelRect.editDrawType = true
  csLabelMask.editDrawType = true
}
export default CreateStructure

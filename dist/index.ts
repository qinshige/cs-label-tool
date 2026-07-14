import Compiler from '../js/compiler.js'
import vm from '../js/vnode.js'
import CSLabelRect from './graphics/rect.js'
import CSLabelMask from './graphics/mask.js'
const csLabelRect = new CSLabelRect()
const csLabelMask = new CSLabelMask()
const compiler = new Compiler()
const el = new vm()
// 设置虚拟DOM 创建结构
function CreateStructure() {
  const { url, editKey } = arguments[0]
  const img = new Image()
  img.src = url
  img.onload = () => {
    this.editKey = editKey
    console.log(arguments[0])
    this.width = img.width
    this.height = img.width
    this.src = img.src
    this.vm = el.h(this) // 初始化实例  图形
    compiler.Render(this.vm, document.body)
    this.draw_target = document.querySelector('#draw_target')
    this.drawMousedown()
    this.drawMousemove()
    this.drawMouseup()
    this.onkeydown()
    this.onkeyup()
    console.log(this)
  }
}
// 鼠标开始绘制
CreateStructure.prototype.drawMousedown = function () {
  this.draw_target.addEventListener('mousedown', function (e) {
    this.startDraw = true
    switch ((window as any).type) {
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
  })
}
// 鼠标移动
CreateStructure.prototype.drawMousemove = function () {
  this.draw_target.addEventListener('mousemove', function (e) {
    if (this.startDraw) {
      switch ((window as any).type) {
        case 'rect':
          csLabelRect.drawRectMousemove(e)
          break
        case 'mask':
          csLabelMask.drawMaskMousemove(e)
          break
      }
    }
  })
}
// 绘制结束
CreateStructure.prototype.drawMouseup = function () {
  this.draw_target.addEventListener('mouseup', function (e) {
    this.startDraw = false
    switch ((window as any).type) {
      case 'rect':
        csLabelRect.drawRectMouseup(e)
        break
      case 'mask':
        csLabelMask.drawMaskMouseup(e)
        break
    }
  })
}
// 键盘事件
CreateStructure.prototype.onkeydown = function () {
  const self = this
  window.onkeydown = function (e) {
    if (e.code === self.editKey) {
      const svg_draw_layer = document.getElementById('svg_draw_layer')
      svg_draw_layer!.style.pointerEvents = 'none'
      csLabelRect.editDrawType = false
      // csLabelMask.editDrawType = false
    }
  }
}
CreateStructure.prototype.onkeyup = function () {
  window.onkeyup = function () {
    const svg_draw_layer = document.getElementById('svg_draw_layer')
    svg_draw_layer!.style.pointerEvents = ''
    csLabelRect.editDrawType = true
    // csLabelMask.editDrawType = true
  }
}

export default CreateStructure

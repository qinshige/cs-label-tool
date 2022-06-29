import Compiler from '../../js/compiler.js'
const compiler = new Compiler()
export default class CSLabelRect {
  move = { x: 0, y: 0, width: 0, height: 0 } // 存储移动式的数据
  initCoor = { x: 0, y: 0 } // 绘制图形
  styles = {} // 设置样式
  editDrawType = true
  drawDataRectResult = []
  vNode = {
    tag: 'svg',
    type: 'svg',
    props: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '100%',
      height: '100%',
    },
    children: [
      {
        tag: 'rect',
        type: 'svg',
        props: {
          id: 'virtual',
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          style:
            'fill:rgb(239, 239, 239);fill-opacity: 0.1; stroke: #2c9c21; stroke-width: 1;',
        },
        children: '',
      },
      {
        tag: 'polyline',
        type: 'svg',
        props: {
          id: 'virtual_polyline',
          points: '0,0',
          style: 'fill:rgb(239, 239, 239, 0.5);stroke:red;stroke-width:2',
        },
      },
    ],
  }
  constructor() {
    // this.styles = styles
  }
  // 更新属性
  updateAttribute(tag, objAttr) {
    if (Object.keys(objAttr).length) {
      for (let attr in objAttr) {
        tag.setAttribute(attr, objAttr[attr])
      }
    }
  }
  // 鼠标按下绘制
  drawRectMousedow(e) {
    if (this.editDrawType) {
      compiler.Render(this.vNode, document.getElementById('svg_draw_layer'))
      this.initCoor = { x: e.offsetX, y: e.offsetY }
      this.move = { x: e.offsetX, y: e.offsetY }
      console.log(this.initCoor)
      this.updateAttribute(document.getElementById('virtual'), this.initCoor)
    }
  }
  // 鼠标移动
  drawRectMousemove(e) {
    if (this.editDrawType) {
      if (e.offsetX - this.initCoor.x > 0 && e.offsetY - this.initCoor.y > 0) {
        this.move.x = this.initCoor.x
        this.move.y = this.initCoor.y
        this.move.height = e.offsetY - this.initCoor.y
        this.move.width = e.offsetX - this.initCoor.x
      } else if (
        e.offsetX < this.initCoor.x &&
        e.offsetY - this.initCoor.y > 0
      ) {
        this.move.x = e.offsetX
        this.move.width = this.initCoor.x - e.offsetX
        this.move.height = e.offsetY - this.initCoor.y
      } else if (
        e.offsetY < this.initCoor.y &&
        e.offsetX - this.initCoor.x > 0
      ) {
        this.move.y = e.offsetY
        this.move.height = this.initCoor.y - e.offsetY
        this.move.width = e.offsetX - this.initCoor.x
      } else if (e.offsetY < this.initCoor.y && e.offsetX < this.initCoor.x) {
        this.move.x = e.offsetX
        this.move.y = e.offsetY
        this.move.height = this.initCoor.y - e.offsetY
        this.move.width = this.initCoor.x - e.offsetX
      }
      this.updateAttribute(document.getElementById('virtual'), this.move)
    }
  }
  // 结束绘制
  drawRectMouseup(e) {
    if (this.editDrawType) {
      if (
        e.offsetX - this.initCoor.x === 0 ||
        e.offsetY - this.initCoor.y === 0
      ) {
        document.getElementById('svg_draw_layer').innerHTML = ''
        return
      }
      this.updateAttribute(document.getElementById('virtual'), {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      })
      if (this.move.width !== 0 && this.move.height !== 0) {
        // 更新充值属性
        this.drawDataRectResult.push({
          tag: 'rect',
          type: 'svg',
          props: {
            ...this.move,
            key: new Date().getTime(),
            style:
              'fill:rgb(239, 239, 239);fill-opacity: 0.6; stroke: #2c9c21; stroke-width: 1;cursor: pointer;',
            'data-index': this.drawDataRectResult.length,
            id: `rect_${this.drawDataRectResult.length}`,
            onClick: this.selectEditDrawRect,
          },
        })
        compiler.Render(
          this.drawDataRectResult[this.drawDataRectResult.length - 1],
          document.getElementById('rect')
        )
      }
      this.move = { x: 0, y: 0, width: 0, height: 0 }
      document.getElementById('svg_draw_layer').innerHTML = ''
    }
  }

  selectEditDrawRect(e) {
    console.log(e.target.id)
  }
}

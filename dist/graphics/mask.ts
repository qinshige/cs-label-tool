import Compiler from '../../js/compiler.js'
const compiler = new Compiler()
export default class CSLabelMask {
  styles = {
    strokeStyle: 'red',
    lineWidth: 10,
    lineCap: 'round',
    lineJoin: 'round',
  } // 设置样式
  ctx: any = null
  editDrawType = null
  canvas: any = null
  lineToMoveData: any = []
  drawResultsList: any = []
  constructor() {}
  drawMaskMousedow(e, template) {
    if (e.buttons === 1) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = template.width
      this.canvas.height = template.height
      this.ctx = this.canvas.getContext('2d')
      const svg_draw_layer = document.getElementById('svg_draw_layer')
      svg_draw_layer!.appendChild(this.canvas)
      this.lineToMoveData.push({ x: e.offsetX, y: e.offsetY })
      this.ctx.beginPath()
      this.ctx.moveTo(e.offsetX, e.offsetY)
      this.ctx.strokeStyle = this.styles.strokeStyle
      this.ctx.lineWidth = this.styles.lineWidth
      this.ctx.lineCap = this.styles.lineCap
      this.ctx.lineJoin = this.styles.lineJoin
    }
  }

  drawMaskMousemove(e) {
    this.ctx.lineTo(e.offsetX, e.offsetY)
    this.ctx.stroke()
    this.lineToMoveData.push({ x: e.offsetX, y: e.offsetY })
  }

  drawMaskMouseup(e) {
    new Promise((resolve, reject) => {
      this.ctx.closePath()
      resolve
    })
      .then(() => {
        const x_min = Math.min.apply(
          null,
          this.lineToMoveData.map((item) => item.x)
        )
        const y_min = Math.min.apply(
          null,
          this.lineToMoveData.map((item) => item.y)
        )
        const x_max = Math.max.apply(
          null,
          this.lineToMoveData.map((item) => item.x)
        )
        const y_max = Math.max.apply(
          null,
          this.lineToMoveData.map((item) => item.y)
        )
        const results = {
          x: x_min - this.styles.lineWidth / 2,
          y: y_min - this.styles.lineWidth / 2,
          height: y_max - y_min + this.styles.lineWidth,
          width: x_max - x_min + this.styles.lineWidth,
        }
        this.convertCanvasToImage(results)
      })
      .then(() => {
        console.log(this.drawResultsList)
        this.lineToMoveData = []
        const svg_draw_layer = document.getElementById('svg_draw_layer')
        svg_draw_layer!.innerHTML = ''
        this.createSvgDOM()
      })
  }

  convertCanvasToImage(results) {
    const canvas = document.createElement('canvas')
    canvas.width = results.width
    canvas.height = results.height
    const ctx = canvas.getContext('2d')
    ctx!.drawImage(
      this.canvas,
      results.x,
      results.y,
      results.width,
      results.height,
      0,
      0,
      results.width,
      results.height
    )
    var image = new Image()
    image.src = canvas.toDataURL('image/png')
    this.drawResultsList.push({ img: image.src, ...results })
  }

  createSvgDOM() {
    const { x, y, width, height, img } =
      this.drawResultsList[this.drawResultsList.length - 1]
    compiler.Render(
      {
        tag: 'g',
        type: 'svg',
        props: {
          declares: this.drawResultsList.length,
        },
        children: [
          {
            tag: 'rect',
            type: 'svg',
            props: {
              width,
              height,
              x,
              y,
              style:
                'fill:rgb(239, 239, 239);fill-opacity: 0; stroke: #2c9c21; stroke-width: 1;',
            },
          },
          {
            tag: 'image',
            type: 'svg',
            props: {
              href: img,
              width,
              height,
              x,
              y,
            },
          },
        ],
      },
      document.getElementById('mask')
    )
  }
}

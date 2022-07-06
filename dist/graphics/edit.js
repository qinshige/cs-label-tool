import Compiler from '../../js/compiler.js'
const compiler = new Compiler()
export class EditRect {
  editNode = {
    tag: 'g',
    type: 'svg',
    props: {
      id: 'edit',
    },
    children: [],
  }
  generateEditdot(editData) {
    const node = generateNode(editData)
    compiler.Render(node, document.getElementById('svg_body'))
  }

  generateNode(editData) {
    editData.forEach((el) => {
      this.editNode.children.push({
        tag: 'circle',
        type: 'svg',
        props: {},
      })
    })
  }
}

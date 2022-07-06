export default class vm {
  h(self) {
    return {
      tag: 'div',
      props: {
        id: 'app',
        style: `position: relative;width: ${self.width / 2}px;height: ${
          self.height / 2
        }px;border: 2px solid red; padding: 10px;`,
      },
      children: [
        {
          tag: 'div',
          props: {
            declares: '绘制主体拖拽层',
            style: `width: ${self.width / 2}px;height: ${
              self.height / 2
            }px;position: absolute;`,
            onMousedown: self.drawMousedown,
            onMousemove: self.drawMousemove,
            onMouseup: self.drawMouseup,
          },
          children: [
            {
              tag: 'div',
              props: {
                class: 'image_layer',
                declares: '图片层',
                style: `width: ${self.width / 2}px;height: ${
                  self.height / 2
                }px;position: absolute;`,
              },
              children: [
                {
                  tag: 'img',
                  props: {
                    src: self.src,
                    declare: '图片',
                    style: `width: ${self.width / 2}px;height: ${
                      self.height / 2
                    }px;`,
                  },
                },
              ],
            },
            {
              tag: 'div',
              props: {
                class: 'svg_draw_show_layer',
                declare: '绘制展示层',
                style: `width: ${self.width / 2}px;height: ${
                  self.height / 2
                }px;position: absolute;`,
              },
              children: [
                {
                  tag: 'svg',
                  type: 'svg',
                  props: {
                    xmlns: 'http://www.w3.org/2000/svg',
                    width: '100%',
                    height: '100%',
                    id: 'svg_body',
                  },
                  children: [
                    {
                      tag: 'g',
                      type: 'svg',
                      props: {
                        id: 'rect',
                        declarescript: '矩形展示',
                      },
                      children: [],
                    },
                    {
                      tag: 'g',
                      type: 'svg',
                      props: {
                        id: 'mask',
                        declarescript: 'mask',
                      },
                      children: [],
                    },
                    {
                      tag: 'g',
                      type: 'svg',
                      props: {
                        id: 'v_polyline',
                        declarescript: '多线段展示',
                      },
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              tag: 'div',
              props: {
                id: 'svg_draw_layer',
                declare: '绘制层',
                style: `width: ${self.width / 2}px;height: ${
                  self.height / 2
                }px;position: absolute;cursor: crosshair;`,
              },
              children: '',
            },
          ],
        },
      ],
    }
  }
}

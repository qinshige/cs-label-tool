class AiLabel {
    startState = false; // 开始标注状态
    labelData = [];
    svg_body = null;
    svg = null;
    // 字符串转Dom
    dom = "<select><option value='标签名称1'>标签名称1</option><option value='saab'>Saab</option><option value='opel'>Opel</option><option value='audi'>Audi</option></select>";
    virtualNode = null; // 虚拟节点
    // 存放绘制时的数据
    drawWhenData = {
        start_x: 0,
        start_y: 0,
        width: 0,
        height: 0
    };
    editState = false; // 编辑状态

  
    // 初始化
    createRectLabel(config) {
        this.svg = this.createTag("svg", {
            version: "1.1",
            xmlns: 'http://www.w3.org/2000/svg',
            baseProfile: "full",
            width: "100%",
            height: "100%"
        })
        this.svg_body = document.querySelector(`#${config}`);
        this.svg_body.appendChild(this.svg);
        const virtualNode = this.createTag("rect", this.createRect(0, 0, 0, 0));
        virtualNode.setAttribute("id", "virtualNode");
        this.svg.appendChild(virtualNode);
    }

    createNode(dom) {
        const template = dom;
        let tempNode = document.createElement('div');
        tempNode.innerHTML = template;
        return tempNode.firstChild;
    }


    // 创建标签
    createTag(tag, objAttr) {
        var svgNS = 'http://www.w3.org/2000/svg';
        var oTag = document.createElementNS(svgNS, tag);
        for (let attr in objAttr) {
            oTag.setAttribute(attr, objAttr[attr]);
        }
        return oTag;
    };

    // 清除编辑节点
    clearEditNode() {
        const node = document.querySelectorAll(`.edit`);
        if (node.length) {
            for (let i = 0; i < node.length; i++) {
                node[i].style.display = "none"
            }
        }
    };

    // 展示编辑节点
    showEditNode(id) {

        const node = document.querySelectorAll(`#${id} .edit`);
        for (let i = 0; i < node.length; i++) {
            node[i].style.display = "block";
        }
    };

    // 创矩形
    createRect(x, y, h, w) {
        return {
            width: w,
            height: h,
            x: x,
            y: y,
            style: `fill:rgb(239, 239, 239);fill-opacity: 0.1; stroke: #2c9c21; stroke-width: 1;`
        }
    };


    createEditNode(g, w, h, x, y) {
        // 左上
        // const rect_l_t = createTag("rect", { class: 'edit rect_l_t', width: '8', height: '8', fill: 'red', x: x - 4, y: y - 4, style: "cursor: nw-resize;" });
        // 左中
        // const rect_l_c = createTag("rect", { class: 'edit rect_l_c', width: '8', height: '8', fill: 'red', x: x - 4, y: y - 4 + (h / 2), style: "cursor: ew-resize;" });
        // 左下
        // const rect_l_b = createTag("rect", { class: 'edit rect_l_b', width: '8', height: '8', fill: 'red', x: x - 4, y: y - 4 + h, style: "cursor: sw-resize;" });
        // 上中
        // const rect_t_c = createTag("rect", { class: 'edit rect_t_c', width: '8', height: '8', fill: 'red', x: x - 4 + (w / 2), y: y - 4, style: "cursor: n-resize" });
        // 右上
        const rect_r_t = this.createTag("rect", {
            class: 'edit rect_r_t',
            width: '8',
            height: '8',
            fill: 'red',
            x: x - 4 + w,
            y: y - 4,
            style: "cursor: ne-resize;"
        });
        // 下中
        // const rect_b_c = createTag("rect", { class: 'edit rect_b_c', width: '8', height: '8', fill: 'red', x: x - 4 + (w / 2), y: y - 4 + h, style: "cursor: s-resize;" });
        // 右下
        const rect_r_b = this.createTag("rect", {
            class: 'edit rect_r_b',
            width: '8',
            height: '8',
            fill: 'red',
            x: x - 4 + w,
            y: y - 4 + h,
            style: "cursor: se-resize;"
        });
        // 右中
        // const rect_r_c = createTag("rect", { class: 'edit rect_r_c', width: '8', height: '8', fill: 'red', x: x - 4 + w, y: y - 4 + (h / 2), style: "cursor: ew-resize;" });
        // g.appendChild(rect_l_t);
        // g.appendChild(rect_t_c);
        g.appendChild(rect_r_t);

        // g.appendChild(rect_l_c);
        // g.appendChild(rect_l_b);
        // g.appendChild(rect_b_c);
        g.appendChild(rect_r_b);
        const foreignObject = this.createTag("foreignObject", {
            class: `foreignObject`,
            height: 22,
            width: w - 8,
            x,
            y: y - 4 + h,
        });
        foreignObject.appendChild(this.createNode(this.dom));
        g.appendChild(foreignObject);
        g.addEventListener("dblclick", () => {
            this.handlerG(g)
        });
    };
    // 创建节点
    createNewNode(id, w, h, x, y) {
        const g = this.createTag("svg", {
            id: `qs_${id}`,
            width: "100%",
            height: "100%"
        });
        const rect = this.createTag("rect", this.createRect(x, y, h, w));
        rect.setAttribute("class", "rect");
        this.svg.appendChild(g);
        g.appendChild(rect);
        this.createEditNode(g, w, h, x, y);
    };
    // 绘制矩形
    drawRectMain() {
        const virtualNode = document.querySelector(`#virtualNode`);
        this.svg_body.onmousedown = (event) => {
            if(this.editState) {
                return
            } 
            this.svg.style.cursor = "crosshair";
            this.drawWhenData.start_x = event.offsetX;
            this.drawWhenData.start_y = event.offsetY;
            this.updateAttribute(virtualNode, { x: this.drawWhenData.start_x, y: this.drawWhenData.start_y });
            this.startState = true;
            this.svg_body.onmousemove = (event) => {
                if (this.startState) {
                    this.drawWhenData.width = event.offsetX - this.drawWhenData.start_x;
                    this.drawWhenData.height = event.offsetY - this.drawWhenData.start_y;
                    this.updateAttribute(virtualNode, { width: event.offsetX - this.drawWhenData.start_x, height: event.offsetY - this.drawWhenData.start_y });
                }
            }
            this.svg_body.onmouseup = () => {
                if(this.editState) {
                    return
                } 
                const { start_x, start_y, width, height } = this.drawWhenData;
                this.startState = false;
                this.updateAttribute(virtualNode, { x: 0, y: 0, width: 0, height: 0 });
                this.labelData.push({
                    id: new Date().getTime(),
                    width,
                    height,
                    x: start_x,
                    y: start_y,
                    style: {
                        fillStyle: 'rgb(239, 239, 239)',
                        stroke: '#2c9c21',
                        strokeWidth: 1
                    }
                });
                this.createElement(this.labelData);
            };
            // onmouseleave事件
            this.svg_body.onmouseleave = () => { }
        };
    };

    // 设置属性
    updateAttribute(tag, objAttr) {
        for (let attr in objAttr) {
            tag.setAttribute(attr, objAttr[attr]);
        }
    }

    // 更新Dom 坐标
    updateDom(id, e, data) {
        const {
            width,
            height,
            x,
            y
        } = data;
        const ract = document.querySelector(`#${id} .rect`);
        // 判断 当前所方式是否小于
        if (width + (e.clientX - (width + x)) < width / 2 || height + (e.clientY - (height + y)) < height / 2) {
            return
        };

        this.updateAttribute(ract, {
            x,
            y,
            width: width + (e.clientX - (width + x)),
            height: height + (e.clientY - (height + y))
        });
        const rect_r_t = document.querySelector(`#${id} .rect_r_t`);
        this.updateAttribute(rect_r_t, {
            x: width + (e.clientX - width) - 4,
            y: y - 4
        });

        const rect_r_b = document.querySelector(`#${id} .rect_r_b`);
        this.updateAttribute(rect_r_b, {
            x: width + (e.clientX - width) - 4,
            y: height + (e.clientY - height) - 4
        });

        const foreignObject = document.querySelector(`#${id} .foreignObject`);
        this.updateAttribute(foreignObject, {
            x,
            y: height + (e.clientY - height) - 4,
            height: 22,
            width: width + (e.clientX - (width + x)) - 8,
        });
    }

    // 双击编辑图片
    handlerG(tag) {
        const allData = this.labelData.filter(item => `qs_${item.id}` === tag.getAttribute('id'));
        console.log(allData);
        tag.parentNode.removeChild(tag);
        this.svg.appendChild(tag);
        if (allData.length) {
            this.clearEditNode();
            this.showEditNode(`qs_${allData[0].id}`);
            this.bindEvent(`qs_${allData[0].id}`, allData[0]);
        }
    };

    // 编辑事件绑定
    bindEvent(id, data) {
        const dom = document.querySelector(`#${id} .rect_r_b`);
        let flag = false;
        this.editState = true;
        // 根据数据获取
        dom.onmousedown = (event) => {
            flag = true;
            this.svg_body.onmousemove = (e) => {
                if (flag) {
                    this.updateDom(id, e, data);
                }
            }
            this.svg_body.onmouseup = () => {
                flag = false;
                this.editState = false;
            }
        }
    };
    // 创建虚拟svg DOM  id, w, h, x, y
    createElement(data) {
        for (let item of data) {
            this.createNewNode(item.id, item.width, item.height, item.x, item.y)
            this.clearEditNode();
        }
    };
}


export default new AiLabel();
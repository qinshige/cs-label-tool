class RectLibrary {
    startState = false; // 开始标注状态
    labelData = [{
        id: new Date().getTime(),
        width: 100,
        height: 100,
        x: 100,
        y: 100,
        style: {
            fillStyle: 'rgb(239, 239, 239)',
            stroke: '#2c9c21',
            strokeWidth: 1
        }
    }, {
        id: new Date().getTime() + 1,
        width: 100,
        height: 100,
        x: 300,
        y: 300,
        style: {
            fillStyle: 'rgb(239, 239, 239)',
            stroke: '#2c9c21',
            strokeWidth: 1
        }
    }];
    svg_body = null;
    svg = null;
    // 字符串转Dom
    customDom = "<select><option value='标签名称1'>标签名称1</option><option value='saab'>Saab</option><option value='opel'>Opel</option><option value='audi'>Audi</option></select>";
    virtualNode = null; // 虚拟节点
    // 存放绘制时的数据
    drawWhenData = {
        start_x: 0,
        start_y: 0,
        width: 0,
        height: 0
    };
    editState = false; // 编辑状态

    presentNode = null;  // 当前id

    downBtn = null;

    scale = 1;

    // 初始化
    createRectLabel(config) {
        this.svg = this.createTag("svg", {
            version: "1.1",
            xmlns: 'http://www.w3.org/2000/svg',
            baseProfile: "full",
            width: "100%",
            height: "100%"
        });
        this.svg_body = document.querySelector(`#${config}`);
        this.svg_body.appendChild(this.svg);
        const virtualNode = this.createTag("rect", { id: "virtualNode", x: "0", y: "0", width: "0", height: "0", style: "fill:rgb(239, 239, 239);fill-opacity: 0.1; stroke: #2c9c21; stroke-width: 1;" });
        this.svg.appendChild(virtualNode);
        console.log(config);
        // this.createElement(this.labelData);
    }

    createNode(customDom) {
        const template = customDom;
        let tempNode = document.createElement('div');
        tempNode.innerHTML = template;
        return tempNode.firstChild;
    }

    // 创建标签
    createTag(tag, objAttr) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const oTag = document.createElementNS(svgNS, tag);
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
            const rect = document.querySelectorAll(`.rect`);
            for (let i = 0; i < rect.length; i++) {
                rect[i].style.cursor = "default"
            }
        }
    };

    // 展示编辑节点
    showEditNode(id) {
        const edit = document.querySelectorAll(`#${id} .edit`);
        for (let i = 0; i < edit.length; i++) {
            edit[i].style.display = "block";
        }
        const rect = document.querySelectorAll(`#${id} .rect`);
        for (let i = 0; i < rect.length; i++) {
            rect[i].style.cursor = "move"
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

    // 创建编辑标签
    async createEditNode(g, w, h, x, y) {
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
        g.appendChild(rect_r_t);
        g.appendChild(rect_r_b);
        const foreignObject = this.createTag("foreignObject", {
            class: `foreignObject`,
            height: 22,
            width: w === 0 ? w : w - 8,
            x,
            y: y - 4 + h,
        });
        g.appendChild(foreignObject);
        foreignObject.appendChild(this.createNode(this.customDom));
        g.oncontextmenu = (e) => {
            e.preventDefault();
        };
        g.addEventListener("mousedown", (e) => {
            if (e.button == 2) {
                this.handlerG(g)
            }
            e.stopPropagation();
        });
    };
    // 创建节点
    async createNewNode(id, w, h, x, y) {
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
        this.clearEditNode();
    };

    // 绘制矩形 parames
    drawRectMain(parames) {
        this.customDom = parames.customDom;
        const virtualNode = document.querySelector(`#virtualNode`);
        this.addEventListenerFn(this.svg, "click", () => {
            this.startState = false;
            this.downBtn = -1;
            this.clearEditNode();
        });
        this.addEventListenerFn(this.svg, "mousedown", (event) => {
            if (event.button === 0 && !this.startState) {
                this.svg.style.cursor = "crosshair";
                this.drawWhenData.start_x = event.offsetX;
                this.drawWhenData.start_y = event.offsetY;
                this.updateAttribute(virtualNode, { x: this.drawWhenData.start_x, y: this.drawWhenData.start_y });
                this.startState = true;
            }
        });
        this.addEventListenerFn(this.svg, "mousemove", (event) => {
            if (this.startState && event.button === 0) {
                this.drawWhenData.width = event.offsetX - this.drawWhenData.start_x;
                this.drawWhenData.height = event.offsetY - this.drawWhenData.start_y;
                this.updateAttribute(virtualNode, { width: event.offsetX - this.drawWhenData.start_x, height: event.offsetY - this.drawWhenData.start_y });
            }
        });

        this.addEventListenerFn(this.svg, "mouseup", (event) => {
            if (this.startState && event.button === 0) {
                const { start_x, start_y, width, height } = this.drawWhenData;
                this.updateAttribute(virtualNode, { x: 0, y: 0, width: 0, height: 0 });
                this.startState = false;
                const newData = {
                    id: `${parames.id}` + new Date().getTime(),
                    width,
                    height,
                    x: start_x,
                    y: start_y,
                    style: parames.style
                }
                if (this.drawWhenData.width >= 1 && this.drawWhenData.height >= 1) {
                    this.labelData.push(newData);
                    this.readerNode(newData);
                }
                this.drawWhenData.width = 0;
                this.drawWhenData.height = 0;
            }
        })
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
            x,
            y
        } = data;
        var width, height;
        if (this.scale > 1) {
            width = parseInt(data.width * this.scale);
            height = parseInt(data.height * this.scale);
        } else {
            width = parseInt(data.width / this.scale);
            height = parseInt(data.height / this.scale);
        }
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
        this.labelData.forEach(item => {
            if (id.search(item.id.toString()) !== -1) {
                item.x = x;
                item.y = y;
                item.width = width + (e.clientX - (width + x))
                item.height = height + (e.clientY - (height + y))
            }
        })
    }

    // 双击编辑图片
    handlerG(tag) {
        const allData = this.labelData.filter(item => `qs_${item.id}` === tag.getAttribute('id'));
        tag.parentNode.removeChild(tag);
        this.svg.appendChild(tag);
        if (allData.length) {
            this.presentNode = `qs_${allData[0].id}`;
            this.clearEditNode();
            this.showEditNode(`qs_${allData[0].id}`);
            this.bindEvent(`qs_${allData[0].id}`, allData[0]);
        }
    };

    // 删除事件
    removeEventListenerFn(node, event) {
        node.removeEventListener(event, () => {
            event.preventDefault();
        }, false);
    };

    addEventListenerFn(node, event, callback) {
        node.addEventListener(event, (e) => {
            callback(e)
        }, false);
    }

    // 移动改变
    dragHandler() {
        const customDom = document.querySelector(`#${id}`);
    }

    // 编辑事件绑定
    bindEvent(id, data) {
        const customDom = document.querySelector(`#${id} .rect_r_b`);
        let flag = false;
        this.editState = true;
        let btn = 0;
        // 根据数据获取
        customDom.onmousedown = (event) => {
            flag = true;
            this.svg_body.addEventListener("mousemove", (e) => {
                if (flag && event.button === 0) {
                    this.updateDom(id, e, data);
                } else {
                    this.removeEventListenerFn(this.svg_body, "mousemove");
                }
            })
            this.svg_body.addEventListener("mouseup", (e) => {
                flag = false;
                btn = -1;
                this.editState = false;
            })
        }
    };

    // 创建虚拟
    createElement() {
        for (const item of this.labelData) {
            this.createNewNode(item.id, item.width, item.height, item.x, item.y)
            this.clearEditNode();
        }
    };


    // reader
    readerNode(item) {
        this.createNewNode(item.id, item.width, item.height, item.x, item.y)
    }
}


export default new RectLibrary();
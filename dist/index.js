import Compiler from "../js/compiler.js";
import vm from "../js/vnode.js";
const compiler = new Compiler();
const el = new vm();
// newly
import CSLabelRect from "./graphics/rect.js";
const csLabelRect = new CSLabelRect();
import CSLabelMask from "./graphics/mask.js";
const csLabelMask = new CSLabelMask();



// 设置虚拟DOM 创建结构
function CreateStructure() {
    const img = new Image();
    img.src = `../a.webp`;
    img.onload = () => {
        this.width = img.width;
        this.height = img.width;
        this.src = img.src;
        this.vm = el.h(this); // 初始化实例  图形
        compiler.Render(this.vm, document.body);
    }
}
// 鼠标开始绘制
CreateStructure.prototype.drawMousedown = function (e) {
    this.startDraw = true;
    switch (window.type) {
        case 'rect':
            csLabelRect.drawRectMousedow(e);
            break;
        case 'mask':
            console.log(this.offsetWidth);
            csLabelMask.drawMaskMousedow(e, { width: this.offsetWidth, height: this.offsetHeight });
            break;
    }
    // if (window.type === 'rect') {
    //     csLabelRect.drawRectMousedow(e);
    // } else if (window.type === 'polyline') {
    //     polyline.concat(polyline.push(e.offsetX, e.offsetY));
    //     this.polyline = polyline;
    //     console.log("----", this.polyline);
    //     updateAttribute(document.getElementById('virtual_polyline'), { points: this.polyline.toString() });
    // }
}
// 鼠标移动
CreateStructure.prototype.drawMousemove = function (e) {
    if (this.startDraw) {
        switch (window.type) {
            case 'rect':
                csLabelRect.drawRectMousemove(e);
                break;
            case 'mask':
                csLabelMask.drawMaskMousemove(e);
                break;

        }
        // if (window.type === 'rect') {
        //     csLabelRect.drawRectMousemove(e);
        // } else if (window.type === 'polyline') {
        //     this.polyline[this.polyline.length - 1] = e.offsetY;
        //     this.polyline[this.polyline.length - 2] = e.offsetX;
        //     console.log("12121", this.polyline.toString());
        //     updateAttribute(document.getElementById('virtual_polyline'), { points: this.polyline.toString() });
        // }
    }
}
// 绘制结束
CreateStructure.prototype.drawMouseup = function (e) {
    this.startDraw = false;
    switch (window.type) {
        case 'rect':
            csLabelRect.drawRectMouseup(e);
            break;
        case 'mask':
            csLabelMask.drawMaskMouseup(e);
            break;
    }
    // if (window.type === 'rect') {
    //     csLabelRect.drawRectMouseup(e);
    // } else if (window.type === 'polyline') {
    //     drawData.push({
    //         tag: 'polyline',
    //         type: 'svg',
    //         props: {
    //             id: 'v_polyline',
    //             points: "0,0",
    //             style: "fill:none;stroke:black;stroke-width:3"
    //         }
    //     });
    //     compiler.Render(drawData[drawData.length - 1], document.getElementById('rect'));
    // }
}
// 键盘事件
// let keyName = null;
document.onkeydown = function (e) {
    if (e.code === 'AltLeft') {
        console.log(e);
        window.keyName = e.code;
        document.getElementById('svg_draw_layer').style.pointerEvents = 'none';
        csLabelRect.editDrawType = false;
        csLabelMask.editDrawType = false;
    }
}
document.onkeyup = function () {
    // keyName = null;
    window.keyName = null;
    document.getElementById('svg_draw_layer').style.pointerEvents = '';
    csLabelRect.editDrawType = true;
    csLabelMask.editDrawType = true;
    // console.log(e);
}
// CreateStructure.prototyper.keydownFn = function() {
//     // if(e.code === 'AltLeft') {
//     //     document.getElementById('svg_draw_layer').style.pointerEvents = 'none';
//     //     csLabelRect.editDrawType = false;
//     //     csLabelMask.editDrawType = false;
//     // }
// }
// CreateStructure.prototyper.keyupFn = function() {
//     // keyName = null;
//     // document.getElementById('svg_draw_layer').style.pointerEvents = '';
//     // csLabelRect.editDrawType = true;
//     // csLabelMask.editDrawType = true;
//     // console.log(e);
// }
export default CreateStructure
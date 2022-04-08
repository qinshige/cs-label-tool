class AiLabel {
	main;
	canvasMain;
	canvas1;
	canvas2;
	cs2Ctx;
	cs1Ctx;
	flag = false;  // 记录鼠标按下和抬起事件，标记工具是否开始工作
	isEraser; // 判断工具是画笔还是橡皮擦
	lineWidth = 30; // 设置工具粗细
	defaultLineWidth = 30;
	theColor = "#FF0000"; // 设置画笔颜色
	scale = 1;
	imgInof = {
		width: 0,
		height: 0
	}

	setScale() {
		this.canvas1.style.transform = `scale(${this.scale})`;
		this.canvas2.style.transform = `scale(${this.scale})`;
	}

	setDraw(theColor) {
		this.cs2Ctx.strokeStyle = theColor;
	}
	/**
	 * el // 节点id
	 * src // 图片路径
	 * @param {*} config
	 */
	initMap(config) {
		this.createElement(config);
		this.addStyle(config);
		const image = new Image();
		image.src = config.src;
		image.onload = () => {
			this.imgInof = image
			this.cs1Ctx = this.appendChild(this.canvas1, image);
			this.cs2Ctx = this.appendChild(this.canvas2, image);
			this.handle();
		}
	}

	// 创建标签
	createElement(config) {
		this.main = document.querySelector(config.el);
		this.canvasMain = document.createElement('div');
		this.canvas1 = document.createElement('canvas');
		this.canvas2 = document.createElement('canvas');
	}

	// 添加样式
	addStyle(config) {
		this.main.setAttribute("style", `position: absolute; width: 100%; height: 100%;display: flex;justify-content: center;align-items: center;`);
		this.canvasMain.setAttribute("style", `position: relative;`)
		this.canvas1.setAttribute("style", `position: absolute; z-index: 997; background-image: url('${config.src}');transition-delay: 0.8;`);
		this.canvas2.setAttribute("style", "position: absolute; z-index: 999; background-color: transparent;transition-delay: 0.8;");
	}

	// 创建
	appendChild(canvas, image) {
		this.main.appendChild(this.canvasMain);
		canvas.width = image.width;
		canvas.height = image.height;
		this.canvasMain.appendChild(canvas);
		return canvas.getContext("2d");
	}

	reactiveLineWidth() {
		this.lineWidth = this.defaultLineWidth / this.scale;
	}

	// 切换工具
	changeTools(tname) {
		if (tname == 'eraser') {
			this.isEraser = true;
			this.reactiveLineWidth()
			this.canvas2.style.cursor = "url('../img/favicon.ico'),crosshair";// 设置橡皮擦自定义鼠标样式
		} else if (tname == 'pen') {
			this.isEraser = false;
			this.reactiveLineWidth()
			this.canvas2.style.cursor = "crosshair";// 设置橡皮擦自定义鼠标样式
		} else if (tname == 'save') {
			this.downloadImg();
		}
	}
	onMouseScroll(e) {
		e.preventDefault();
		const wheel = e.wheelDelta || -e.detail;
		const delta = Math.max(-1, Math.min(1, wheel));
		if (delta < 0) {//向下滚动
			if (this.scale < 0.5) {
				this.scale = this.scale;
			} else {
				this.scale -= 0.1;
				this.setScale();
			}
		} else {//向上滚动
			this.scale += 0.1;
			this.setScale();
		}
	}

	handle() {
		this.main.onmousewheel = (e) => {
			this.onMouseScroll(e)
			this.reactiveLineWidth()
		}
		this.canvas2.onmousedown = (event) => {
			var event = event || window.event;
			this.cs2Ctx.lineCap = "round";
			this.cs2Ctx.lineJoin = "round";
			var x = event.offsetX;
			var y = event.offsetY;
			this.cs2Ctx.beginPath();
			this.cs2Ctx.moveTo(x, y);
			this.flag = true;
			this.cs2Ctx.lineWidth = this.defaultLineWidth / this.scale;
			this.cs2Ctx.strokeStyle = this.theColor;
		}
		// onmousemove事件
		this.canvas2.onmousemove = (event) => {
			if (this.flag) {
				if (this.isEraser) {
					var w = this.lineWidth;
					let pxs = this.cs1Ctx.getImageData(event.offsetX - w / 2, event.offsetY - w / 2, w, w);
					this.cs2Ctx.putImageData(pxs, event.offsetX - w / 2, event.offsetY - w / 2);
				} else {
					var event = event || window.event;
					var x = event.offsetX;
					var y = event.offsetY;
					this.cs2Ctx.lineTo(x, y);
					this.cs2Ctx.stroke();
				}
			}
		}
		// onmouseup事件
		this.canvas2.onmouseup = () => {
			this.flag = false;
			this.cs2Ctx.closePath();
		}
		// onmouseleave事件
		this.canvas2.onmouseleave = () => {
			this.flag = false;
			this.cs2Ctx.closePath();
		}

	}
	downloadImg() {
		const imgSrc = this.canvas2.toDataURL("image/png");
		console.log(imgSrc);
	}
}
export default new AiLabel();
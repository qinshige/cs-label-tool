import newAiLabel from "./newLabel.js";
class AiLabel {
	main; // 祖父级别
	canvasMain; // cnavas 主体
	canvas1; // 底图 cnavas1
	canvas2; // 绘制层 cnavas2
	cs2Ctx;
	cs1Ctx;
	flag = false; // 记录鼠标按下和抬起事件，标记工具是否开始工作
	isEraser; // 判断工具是画笔还是橡皮擦
	getMarkerData = []; // 涂抹坐标
	getRectData = []; // 矩形数据
	lineWidth = 30; // 设置工具粗细
	defaultLineWidth = 30;
	theColor = "#FF0000"; // 设置画笔颜色
	scale = 1;
	mode; // 选择样式
	imgInof = {
		width: 0,
		height: 0
	};
	keyCode; // 键盘Code
	rect_tag = null;
	// rectData = {
	// 	startX: 0,
	// 	startY: 0,
	// 	endX: 0,
	// 	endY: 0,
	// 	layerIndex: 0,
	// 	layerName: "",
	// 	startState: false
	// };
   

	// 设置缩放比例
	setScale() {
		// this.canvas1.style.transform = `scale(${this.scale})`;
		// this.canvas2.style.transform = `scale(${this.scale})`;
		this.canvasMain.style.transform = `scale(${this.scale})`;
	};

	setDraw(theColor) {
		this.cs2Ctx.strokeStyle = theColor;
	};

	initMap(config) {
		this.createElement(config);
		const image = new Image();
		image.src = config.src;
		image.onload = () => {
			this.imgInof = image;
			this.addStyle(config);
			this.cs1Ctx = this.appendChild(this.canvas1, image);
			this.mode = "rect";
			switch (this.mode) {
				case "rect":
					const div = document.createElement("div");
					div.setAttribute("style", "position: absolute; z-index: 999; background-color: transparent;");
					div.setAttribute("id", "svg_body");
					this.canvasMain.appendChild(div);
					newAiLabel.createRectLabel("svg_body");
					break;
				default:
					this.cs2Ctx = this.appendChild(this.canvas2, image);
					break;
			}
			this.dragHandler();
			this.main.onmousewheel = (e) => {
				this.onMouseScroll(e);
				this.reactiveLineWidth();
			}
		}
	};
 
	// 创建标签
	createElement(config) {
		this.main = document.querySelector(config.el);
		this.canvasMain = document.createElement('div');
		this.canvas1 = document.createElement('canvas');
		this.canvas2 = document.createElement('canvas');
	};

	// 添加样式
	addStyle(config) {
		this.main.setAttribute("style", `position: absolute; width: 100%; height: 100%;`);
		this.canvasMain.setAttribute("style", `position: absolute; width: ${this.imgInof.width}px; height: ${this.imgInof.height}px; `);
		this.canvasMain.setAttribute("id","qs_main");
		this.canvas1.setAttribute("style", `position: absolute; z-index: 997; background-image: url('${config.src}');transition: all 0.1s;`);
		this.canvas2.setAttribute("style", "position: absolute; z-index: 999; background-color: transparent;transition: all 0.1s;");
	};

	// 创建
	appendChild(canvas, image) {
		this.main.appendChild(this.canvasMain);
		canvas.width = image.width;
		canvas.height = image.height;
		this.canvasMain.appendChild(canvas);
		return canvas.getContext("2d");
	};

	reactiveLineWidth() {
		this.lineWidth = this.defaultLineWidth / this.scale;
	};

	// 切换工具
	changeTools(tname) {
		this.mode = tname;
		console.log(tname);
		switch (tname) {
			case "eraser":
				this.isEraser = true;
				// this.reactiveLineWidth();
				// this.canvas2.style.cursor = "url('../img/favicon.ico'),crosshair"; // 设置橡皮擦自定义鼠标样式
				// this.drawMasker();
				break;
			case "pen":
				this.isEraser = false;
				// this.reactiveLineWidth()
				// this.canvas2.style.cursor = "crosshair"; // 设置橡皮擦自定义鼠标样式
				// this.drawMasker();
				break;
			case "save":
				this.downloadImg();
				break;
			case "rect":
				// this.canvas2.style.cursor = "crosshair";
				// this.cs2Ctx.lineWidth = 2 / this.scale;
				// this.cs2Ctx.strokeStyle = "red";
				// this.drawRectMain();


				// newAiLabel.drawRectMain();
				break;
		};
	};

	onMouseScroll(e) {
		e.preventDefault();
		const wheel = e.wheelDelta || -e.detail;
		const delta = Math.max(-1, Math.min(1, wheel));
		if (delta < 0) { //向下滚动
			if (this.scale < 0.5) {
				this.scale = this.scale;
			} else {
				this.scale -= 0.1;
				this.setScale();
			}
		} else { // 向上滚动
			this.scale += 0.1;
			this.setScale();
		}
	};
	drawRect() {
		const { startState } = this.rectData;
		if (startState) {
			this.cs2Ctx.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
			const ract = {
				x: this.rectData.startX,
				y: this.rectData.startY,
				width: this.rectData.endX - this.rectData.startX,
				height: this.rectData.endY - this.rectData.startY
			}
			this.getRectData.push(ract);
			this.rectData.startState = false;
			this.continuousDrawRact();
			this.cs2Ctx.closePath();
		}
	};
	// 绘制矩形
	drawRectMain() {
		this.canvas2.onmousedown = (event) => {
			this.rectData.startX = event.offsetX;
			this.rectData.startY = event.offsetY;
			this.rectData.startState = true;
			this.canvas2.onmousemove = (event) => {
				const { startState } = this.rectData;
				if (startState) {
					this.cs2Ctx.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
					this.rectData.endX = event.offsetX;
					this.rectData.endY = event.offsetY;
					this.cs2Ctx.beginPath();
					this.cs2Ctx.moveTo(event.offsetX, event.offsetY);
					this.cs2Ctx.strokeRect(this.rectData.startX, this.rectData.startY, this.rectData.endX - this.rectData.startX, this.rectData.endY - this.rectData.startY);
					this.continuousDrawRact();
				}
			}
		}
		this.canvas2.onmouseup = () => { this.drawRect(); };
		// onmouseleave事件
		this.canvas2.onmouseleave = () => { this.drawRect(); }
	};
	// 连续绘制
	continuousDrawRact() {
		for (let item of this.getRectData) {
			this.cs2Ctx.strokeRect(item.x, item.y, item.width, item.height);
		}
	};

	// 涂抹橡皮擦
	drawMasker() {
		this.canvas2.onmousedown = (event) => {
			if (this.keyCode === "keyCode") {
				return
			}
			var x = event.offsetX;
			var y = event.offsetY;
			var event = event || window.event;
			this.cs2Ctx.lineCap = "round";
			this.cs2Ctx.lineJoin = "round";
			this.cs2Ctx.beginPath();
			this.cs2Ctx.moveTo(x, y);
			this.flag = true;
			this.cs2Ctx.lineWidth = this.defaultLineWidth / this.scale;
			this.cs2Ctx.strokeStyle = this.theColor;
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
						this.getMarkerData.push({ x: x, y: y });
					}
				}
			};
		};

		this.canvas2.onmouseup = () => {
			this.flag = false;
			this.cs2Ctx.closePath();
		};
		// onmouseleave事件
		this.canvas2.onmouseleave = () => {
			this.flag = false;
			this.cs2Ctx.closePath();
		}
	};

	// 拖动
	dragHandler() {
		document.onkeydown = (e) => {
			if (e.code === "Space") {
				this.canvas2.style.cursor = "move";
				this.keyCode = "keyCode";
				this.dragEvent();
			}
		}
		document.onkeyup = () => {
			this.keyCode = null;
			this.canvas2.style.cursor = "crosshair";
		}
	};
	// 多动
	dragEvent() {
		const box = this.canvasMain;
		box.onmousedown = (el) => {
			document.onmousemove = (e) => {
				if (!this.keyCode) {
					return
				}
				box.style.left = e.clientX - el.offsetX + "px";
				box.style.top = e.clientY - el.offsetY + "px";
				document.onmouseup = () => {
					document.onmousemove = null;
					document.onmouseup = null;
				};
			};
		};
	}

	downloadImg() {
		const imgSrc = this.canvas2.toDataURL("image/png");
		console.log(imgSrc);
	}
}
export default new AiLabel();
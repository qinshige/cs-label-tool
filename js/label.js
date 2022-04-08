class AiLabel {
	main;
	canvas1;
	canvas2;
	cs2Ctx;
	cs1Ctx;
	flag = false;  // 记录鼠标按下和抬起事件，标记工具是否开始工作
	isEraser; // 判断工具是画笔还是橡皮擦
	lineWidth = 30; // 设置工具粗细
	// 设置画笔颜色
	theColor = "#FF0000";
	setDraw() {
		this.cs2Ctx.strokeStyle = theColor;
	}
	/**
	 * el // 节点id
	 * src // 图片路径
	 * @param {*} config
	 */
	initMap(config) {
		this.createElement(config);
		this.addStyle();
		const image = new Image();
		image.src = config.src;
		image.onload = () => {
			this.cs1Ctx = this.appendChild(this.canvas1, image);
			this.cs2Ctx = this.appendChild(this.canvas2, image);
			this.cs1Ctx.drawImage(image, 0, 0);
			this.cs2Ctx.fillStyle = 'rgba(255, 255, 255, 0)'
			this.handle();
		}
	}

	// 创建标签
	createElement(config) {
		this.main = document.querySelector(config.el);
		this.canvas1 = document.createElement('canvas');
		this.canvas2 = document.createElement('canvas');
	}

	// 添加样式
	addStyle() {
		this.main.style.position = 'relative';
		this.canvas1.setAttribute("style", "position: absolute; z-index: 997");
		this.canvas2.setAttribute("style", "position: absolute; z-index: 998");
	}

	// 创建
	appendChild(canvas, image) {
		canvas.width = image.width;
		canvas.height = image.height;
		this.main.appendChild(canvas);
		return canvas.getContext("2d");
	}
	// 切换工具
	changeTools(tname) {
		if (tname == 'eraser') {
			this.isEraser = true;
			this.lineWidth = 30;
			this.canvas2.style.cursor = "url('../img/favicon.ico'),crosshair";// 设置橡皮擦自定义鼠标样式
		} else if (tname == 'pen') {
			this.isEraser = false;
			this.lineWidth = 30;
			this.canvas2.style.cursor = "crosshair";// 设置橡皮擦自定义鼠标样式
		} else if(tname == 'save') {
			this.downloadImg();
		}
	}
	handle() {
		this.canvas2.onmousedown = (eva) => {
			var eva = eva || window.event;
			this.cs2Ctx.lineCap = "round";
			this.cs2Ctx.lineJoin = "round";
			var x = eva.offsetX;
			var y = eva.offsetY;
			this.cs2Ctx.beginPath();
			this.cs2Ctx.moveTo(x, y);
			this.flag = true;
			this.cs2Ctx.lineWidth = this.lineWidth;
			this.cs2Ctx.strokeStyle = this.theColor;
		}
		// onmousemove事件
		this.canvas2.onmousemove = (eva) => {
			if (this.flag) {
				if (this.isEraser) {
					var w = this.lineWidth;
					let pxs = this.cs1Ctx.getImageData(eva.offsetX - w / 2, eva.offsetY - w / 2, w, w);
					this.cs2Ctx.putImageData(pxs, eva.offsetX - w / 2, eva.offsetY - w / 2);
				} else {
					var eva = eva || window.event;
					var x = eva.offsetX;
					var y = eva.offsetY;
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
		var imgSrc = this.canvas2.toDataURL("image/png");
		console.log(imgSrc);
	}
}
export default new AiLabel();


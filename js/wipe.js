class AiLabel {
	main;
	canvas1;
	canvas2;
	cs2Ctx;
	cs1Ctx;
	// --------- 画笔和橡皮擦功能实现 -------------
	flag = false;  // 记录鼠标按下和抬起事件，标记工具是否开始工作
	isEraser; // 判断工具是画笔还是橡皮擦
	lineWidth = 30; // 设置工具粗细
	// 设置画笔颜色
	theColor = "#FF0000";
	setDraw() {
		this.cs2Ctx.strokeStyle = theColor;
	}
	initMap(config) {
		this.main = document.querySelector(config.id);
		const canvas1 = document.createElement('canvas');
		this.main.appendChild(canvas1);
		const canvas2 = document.createElement('canvas');
		this.main.appendChild(canvas2);
		this.cs2Ctx = canvas2.getContext("2d");
		this.cs1Ctx = canvas1.getContext("2d");
	}
	// 切换工具
	changeTools(tname) {
		if (tname == 'eraser') {
			this.isEraser = true;
			this.lineWidth = 30;
			$(canvas2).css({ 'cursor': "url('./img/b.jpg'),default" }); // 设置橡皮擦自定义鼠标样式
		} else if (tname == 'pen') {
			this.isEraser = false;
			this.lineWidth = 30;
			$(canvas2).css({ 'cursor': 'crosshair' }); // 设置画笔系统鼠标样式(十字)
		}
	}
	handle() {
		this.canvas2.onmousedown = function (eva) {
			var eva = eva || window.event;
			this.cs2Ctx.lineCap = "round";
			this.cs2Ctx.lineJoin = "round";
			var x = eva.offsetX;
			var y = eva.offsetY;
			this.cs2Ctx.beginPath();
			this.cs2Ctx.moveTo(x, y);
			this.flag = true;
			this.cs2Ctx.lineWidth = lineWidth;
			this.cs2Ctx.strokeStyle = "#FF0000";
		}
		// onmousemove事件
		this.canvas2.onmousemove = (eva) => {
			if (this.flag) {
				if (this.isEraser) {
					var w = this.lineWidth;
					// noinspection JSAnnotator
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
		this.canvas2.onmouseup = function () {
			this.flag = false;
			this.cs2Ctx.closePath();
		}
		// onmouseleave事件
		this.canvas2.onmouseleave = function () {
			this.flag = false;
			this.cs2Ctx.closePath();
		}
	}
	downloadImg() {
		// var canvas = document.getElementById('canvas2');
		console.log(this.canvas2);
		var imgSrc = this.canvas2.toDataURL("image/png");
		console.log(imgSrc);
	}
}

// onmousedown事件


// --------- 画笔和橡皮擦功能实现 -------------

// 保存画布


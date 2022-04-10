# canvasAiLabel

#### 介绍
一个用于标注的 canvas标注库，以实现涂抹、橡皮擦、矩形画框功能

#### 使用方法
```
    <div class="tooltip-pen">
        <b>
            <input type="button" value="铅笔" onclick="dosave('pen');" />
            <input type="button" value="橡皮檫" onclick="dosave('eraser');" />
            <input type="button" value="橡皮檫" onclick="dosave('save');" />
            <input type="button" value="橡皮檫" onclick="changeStyle()" />
        </b>
    </div>
    <div id="main">
        
    </div>
    
    <script type="module">
        import AiLabel from "./js/label.js";
        // 切换
        function initMap() {
            AiLabel.initMap({
                el: "#main",
                src: "./img/a.jpg",
            })
        }
        initMap();
        window.dosave = (val) => {
            console.log(val)
            AiLabel.changeTools(val)
        }

        window.changeStyle = (val) => {
            AiLabel.setDraw("#fff")
        }
    </script>


```

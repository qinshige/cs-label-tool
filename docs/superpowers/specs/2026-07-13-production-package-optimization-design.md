# cs-label-tool 正式版包体优化设计

## 目标

将 `cs-label-tool` 从 `2.0.0-alpha.1` 升级为正式版 `2.0.0`，在不删除现有标注能力和公开入口的前提下减少 npm 包体积。

## 当前基线

- npm tarball：94.8 kB。
- 解压体积：400.6 kB。
- `dist/index.js`：68.1 kB。
- `dist/index.js.map`：224.4 kB。
- 发布文件：74 个，其中大量为 `.map`。

## 实现方案

1. 发布构建关闭 JavaScript source map。
2. TypeScript 声明构建关闭 declaration map。
3. 发布的 ESM 文件使用 esbuild 压缩。
4. `package.json` 标记 `sideEffects: false`，让消费端构建工具安全移除未使用导出。
5. 删除已确认无行为价值的重复调用和死代码，不删除现有公开 API。
6. 版本升级为 `2.0.0`，发布到 npm 的 `latest` 标签。

## 兼容性边界

必须保留矩形、多边形、涂抹、橡皮擦、选择编辑、删除、撤销重做、标签、图片视图、Web Component、函数式 API 和实例 API。

不拆分新的 npm 子包，不移除底层导出，不改变标注数据结构，不改变 Vue/React 的接入方式。

## 验收标准

- `npm run check` 全部通过。
- Playwright 浏览器测试全部通过。
- `npm pack --dry-run` 中不存在 `.map` 文件。
- tarball 不超过 45 kB。
- 干净临时项目可从 npm 安装 `cs-label-tool@2.0.0`，通过 ESM 导入和 TypeScript 编译。
- 浏览器可加载 `a.webp`，创建 4 层 Canvas，并通过公开 API 渲染矩形和多边形。

## 发布安全

发布前检查 npm 账号、远端版本占用、tarball 文件清单和 dist-tag。发布后从 npm 官方注册表重新查询，并在全新临时目录安装正式版本做最终冒烟测试。

# Production Package Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 发布保留全部现有功能、tarball 不超过 45 kB 的 `cs-label-tool@2.0.0`。

**Architecture:** 保持当前单入口 ESM 架构和公开 API 不变，只优化发布构建与元数据。通过关闭调试映射、压缩 ESM、声明无副作用和删除确定的重复代码降低包体，并用源码测试、浏览器测试、打包检查和远端安装四层验证。

**Tech Stack:** TypeScript 7、Vite 8、Vitest 4、Playwright 1.61、npm registry。

## Global Constraints

- 正式版本固定为 `2.0.0`。
- npm tarball 必须不超过 45 kB。
- 发布文件中不得包含 `.map`。
- 不删除或重命名现有公开 API。
- 不改变矩形、多边形、Mask、工具和快照数据结构。
- 发布标签为 `latest`。

---

### Task 1: 固化发布构建规则

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.build.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: 当前 `src/index.ts` 单入口 ESM 构建。
- Produces: 无 source map、已压缩且声明可 Tree Shaking 的 `dist`。

- [ ] **Step 1: 记录当前包体基线**

Run: `npm pack --dry-run --json`

Expected: `size` 约为 94818，文件清单包含 `dist/index.js.map` 和多个 `.d.ts.map`。

- [ ] **Step 2: 修改发布配置**

在 `vite.config.ts` 中设置：

```ts
build: {
  minify: 'oxc',
  sourcemap: false,
}
```

在 `tsconfig.build.json` 中设置：

```json
"declarationMap": false
```

在 `package.json` 中设置：

```json
"version": "2.0.0",
"sideEffects": false
```

- [ ] **Step 3: 验证构建产物**

Run: `npm run build && find dist -name '*.map' -print`

Expected: 构建成功，`find` 没有输出。

### Task 2: 清理确定的冗余代码

**Files:**
- Modify: `src/image/image-commands.ts`

**Interfaces:**
- Consumes: `Renderer.invalidate(layer)`。
- Produces: 切换图片时每个 Canvas 层只失效一次，行为不变。

- [ ] **Step 1: 运行相关测试建立基线**

Run: `npx vitest run tests/image/image-commands.test.ts`

Expected: 测试通过。

- [ ] **Step 2: 删除重复调用**

将连续两次相同调用：

```ts
state.renderer?.invalidate('interaction')
state.renderer?.invalidate('interaction')
```

改为一次调用。

- [ ] **Step 3: 重新运行相关测试**

Run: `npx vitest run tests/image/image-commands.test.ts`

Expected: 测试通过。

### Task 3: 验证正式包体与功能

**Files:**
- Verify: `dist/**`
- Verify: npm tarball dry-run manifest

**Interfaces:**
- Consumes: Tasks 1-2 的正式构建产物。
- Produces: 满足发布门槛的 `cs-label-tool@2.0.0` tarball。

- [ ] **Step 1: 运行完整源码检查**

Run: `npm run check`

Expected: TypeScript、64 个单元测试和 Vite 构建全部通过。

- [ ] **Step 2: 运行浏览器回归**

Run: `npm run test:e2e`

Expected: 所有 Playwright 用例通过。

- [ ] **Step 3: 检查 tarball**

Run: `npm pack --dry-run --json`

Expected: `size <= 45000`，文件路径均不以 `.map` 结尾。

- [ ] **Step 4: 本地 tarball 消费测试**

在干净临时目录安装 `npm pack` 生成的 tarball，运行 ESM 导入、`tsc --noEmit`、Vite 浏览器渲染和生产构建。

Expected: 公开导出存在，类型检查通过，状态显示 4 个 Canvas 和 2 条标注，生产构建成功。

### Task 4: 发布并验证 `2.0.0`

**Files:**
- Publish: `cs-label-tool@2.0.0`

**Interfaces:**
- Consumes: Task 3 验证通过的 tarball。
- Produces: npm 官方注册表中的正式版本和 `latest` 标签。

- [ ] **Step 1: 检查远端版本**

Run: `npm view cs-label-tool@2.0.0 version --registry=https://registry.npmjs.org`

Expected: 发布前返回 404，表示版本未占用。

- [ ] **Step 2: 发布正式版**

Run: `npm publish --registry=https://registry.npmjs.org --access public --tag latest`

Expected: 输出 `+ cs-label-tool@2.0.0`，通行密钥验证由 npm 官方页面完成。

- [ ] **Step 3: 从官方注册表验证**

Run: `npm view cs-label-tool@2.0.0 name version dist-tags dist.tarball --json --registry=https://registry.npmjs.org`

Expected: 版本为 `2.0.0`，`latest` 指向 `2.0.0`。

- [ ] **Step 4: 远端干净安装**

在新的临时目录执行 `npm install cs-label-tool@2.0.0 --registry=https://registry.npmjs.org`，重复 ESM 导入、类型检查和 Vite 构建。

Expected: 安装与所有消费测试通过。

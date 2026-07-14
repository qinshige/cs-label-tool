# Demo Snapshot Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toolbar action to `/demo/` that displays the latest `getSnapshot(annotator)` result as formatted JSON in a copyable modal dialog.

**Architecture:** Keep the feature entirely in the demo layer. The toolbar opens a native `<dialog>`; `demo/main.ts` obtains a fresh immutable snapshot, formats it, renders it into a `<pre>`, and copies the exact displayed string through the Clipboard API. A Playwright test exercises the public demo UI and compares the displayed JSON with the existing `demoTest.snapshot()` hook.

**Tech Stack:** TypeScript 7, native HTML `<dialog>`, native Clipboard API, Vite, Playwright 1.61.

## Global Constraints

- Do not add runtime or development dependencies.
- Do not modify the core annotation snapshot API.
- Keep the existing JSON download action unchanged.
- Match the demo's existing dark visual language.
- Preserve unrelated changes already present in `package.json` and `package-lock.json`.

---

### Task 1: Add and verify the snapshot result dialog

**Files:**
- Modify: `demo/index.html`
- Modify: `demo/main.ts`
- Create: `tests/browser/demo-snapshot-dialog.spec.ts`
- Modify: `tests/browser/globals.d.ts`

**Interfaces:**
- Consumes: `getSnapshot(annotator): AnnotationSnapshot`, the existing `toast(message)` helper, and `window.demoTest.snapshot()`.
- Produces: toolbar button `#btn-get-result`, dialog `#snapshot-dialog`, formatted output `#snapshot-json`, copy action `#btn-copy-snapshot`, and close action `#btn-close-snapshot`.

- [ ] **Step 1: Write the failing browser test**

Create `tests/browser/demo-snapshot-dialog.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('shows and copies the latest formatted annotation snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText(text: string) {
          window.copiedSnapshotJson = text
        },
      },
    })
  })
  await page.goto('/demo/')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  await page.evaluate(() => {
    window.demoTest.addRect('person', {
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    })
  })

  await page.getByRole('button', { name: '获取结果' }).click()
  const dialog = page.getByRole('dialog', { name: '标注结果 JSON' })
  await expect(dialog).toBeVisible()

  const displayed = await dialog.locator('#snapshot-json').textContent()
  const snapshot = await page.evaluate(() => window.demoTest.snapshot())
  expect(JSON.parse(displayed ?? '')).toEqual(snapshot)
  expect(displayed).toContain('\n  "annotations": [')

  await dialog.getByRole('button', { name: '复制 JSON' }).click()
  expect(await page.evaluate(() => window.copiedSnapshotJson)).toBe(displayed)
  await dialog.getByRole('button', { name: '关闭' }).click()
  await expect(dialog).not.toBeVisible()
})
```

Extend `tests/browser/globals.d.ts`:

```ts
interface Window {
  copiedSnapshotJson?: string
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:e2e -- tests/browser/demo-snapshot-dialog.spec.ts --project=chromium
```

Expected: FAIL because the `获取结果` toolbar button and snapshot dialog do not exist.

- [ ] **Step 3: Add the native dialog markup and matching styles**

In `demo/index.html`, add this toolbar button beside the existing export action:

```html
<button id="btn-get-result" title="获取标注结果">📋 获取结果</button>
```

Add a labelled native dialog after `#app`:

```html
<dialog id="snapshot-dialog" aria-labelledby="snapshot-dialog-title">
  <div class="snapshot-dialog-shell">
    <header class="snapshot-dialog-header">
      <div>
        <h2 id="snapshot-dialog-title">标注结果 JSON</h2>
        <p>来自 getSnapshot(annotator) 的最新只读快照</p>
      </div>
      <button id="btn-close-snapshot" type="button" aria-label="关闭弹窗">×</button>
    </header>
    <pre id="snapshot-json" tabindex="0"></pre>
    <footer class="snapshot-dialog-footer">
      <button id="btn-copy-snapshot" type="button">复制 JSON</button>
      <button id="btn-dismiss-snapshot" type="button">关闭</button>
    </footer>
  </div>
</dialog>
```

Style the dialog with a centered maximum size of `min(880px, calc(100vw - 32px))`, a maximum height of `calc(100vh - 48px)`, the existing `#111821`/`#202832` dark palette, a scrollable monospace `<pre>`, and a semi-transparent `::backdrop`.

- [ ] **Step 4: Implement fresh snapshot display, copy, and close behavior**

In `demo/main.ts`, bind the dialog elements and keep the displayed string in one variable:

```ts
const snapshotDialog = document.getElementById('snapshot-dialog') as HTMLDialogElement
const snapshotJsonEl = document.getElementById('snapshot-json')!
let displayedSnapshotJson = ''

function showSnapshotDialog(): void {
  displayedSnapshotJson = JSON.stringify(getSnapshot(annotator), null, 2)
  snapshotJsonEl.textContent = displayedSnapshotJson
  snapshotDialog.showModal()
}

async function copySnapshotJson(): Promise<void> {
  try {
    await navigator.clipboard.writeText(displayedSnapshotJson)
    toast('标注结果已复制')
  } catch {
    toast('复制失败，请手动选择 JSON')
  }
}
```

Bind `#btn-get-result` to `showSnapshotDialog`, `#btn-copy-snapshot` to `copySnapshotJson`, and both close buttons to `snapshotDialog.close()`.

- [ ] **Step 5: Run focused verification and make it GREEN**

Run:

```bash
npm run test:e2e -- tests/browser/demo-snapshot-dialog.spec.ts --project=chromium
```

Expected: 1 passed.

- [ ] **Step 6: Run project verification**

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e -- tests/browser/demo-snapshot-dialog.spec.ts
git diff --check
```

Expected: TypeScript, all unit tests, the production build, and the dialog test in Chromium/Firefox/WebKit pass; `git diff --check` produces no output.

- [ ] **Step 7: Commit only the demo feature files**

```bash
git add demo/index.html demo/main.ts tests/browser/demo-snapshot-dialog.spec.ts tests/browser/globals.d.ts docs/superpowers/plans/2026-07-14-demo-snapshot-dialog.md
git commit -m "feat: show annotation snapshot in demo dialog"
```

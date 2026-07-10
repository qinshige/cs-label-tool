# Milestone 1 Engine and Vector Annotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a publishable, framework-free TypeScript annotation library with a functional API, lossless viewport transforms, rectangle and polygon authoring/editing, labels, bounded undo/redo, a layered Canvas renderer, and an optional native Web Component UI.

**Architecture:** An opaque `Annotator` context owns domain and interaction state. Public functions dispatch validated commands; tools translate normalized pointer input into commands; the renderer derives pixels from original-image geometry. Web Components consume only the public functional API.

**Tech Stack:** Node.js 22.12+, TypeScript 7.0.2, Vite 8.1.4 library mode, Vitest 4.1.10, Playwright 1.61.1, native DOM/Canvas/Pointer Events, ESM.

## Global Constraints

- Package name remains `cs-label-tool`.
- Runtime dependencies remain empty.
- Output is ESM-only with declarations and source maps.
- Browser baseline is the latest two Chrome, Edge, and Firefox major versions plus Safari 17+.
- Original-image coordinates are the only persisted annotation coordinates.
- Public mutation APIs are functions accepting an explicit opaque `Annotator` context.
- Canvas backing dimensions are derived from viewport size and `devicePixelRatio`, never source-image size.
- Milestone 1 includes standard images, rectangles, polygons, selection/editing, labels, bounded history, and basic Web Components.
- Tile pyramids, masks, AI inference, COCO/YOLO, and autosave are excluded from this plan and retain their design contracts for later plans.
- Every production behavior follows red-green-refactor; configuration-only scaffolding is the sole non-behavior exception.

---

## File Map

```text
src/
├── core/
│   ├── annotator.ts       Opaque context creation, lifecycle, state access
│   ├── commands.ts        Atomic command execution and bounded history
│   ├── events.ts          Typed subscription and isolated event delivery
│   ├── state.ts           Domain and interaction state constructors
│   └── types.ts           Public core, label, annotation, and error types
├── geometry/
│   ├── matrix.ts          Affine transform creation and inversion
│   ├── polygon.ts         Polygon bounds, hit testing, and validation
│   ├── rect.ts            Rectangle normalization and hit testing
│   └── types.ts           Point, bounds, and matrix types
├── viewport/
│   └── viewport.ts        Pan, zoom-at-point, fit, and coordinate conversion
├── spatial/
│   └── grid-index.ts      Original-coordinate uniform-grid spatial index
├── image/
│   ├── standard-source.ts URL/Blob/ImageBitmap loading
│   └── types.ts           Image source contract and metadata
├── render/
│   ├── canvas-layers.ts   Viewport-sized Canvas layer lifecycle
│   ├── canvas-renderer.ts Image, annotation, and interaction painting
│   └── scheduler.ts       requestAnimationFrame invalidation coalescing
├── labels/
│   └── labels.ts          Label registration and active-label commands
├── tools/
│   ├── controller.ts      Scoped Pointer Events and active-tool dispatch
│   ├── polygon-tool.ts    Polygon creation state machine
│   ├── rect-tool.ts       Rectangle creation state machine
│   ├── select-tool.ts     Selection, movement, handles, and vertex editing
│   └── types.ts           Functional tool contract and normalized input
├── components/
│   ├── annotator-element.ts Complete native component shell
│   ├── define.ts          Idempotent custom-element registration
│   └── styles.ts          Default CSS string and exposed parts
└── index.ts               Stable package exports
tests/
├── core/
├── geometry/
├── viewport/
├── spatial/
├── tools/
└── browser/
demo/
├── index.html
└── main.ts
```

## Task 1: Establish the Publishable TypeScript Baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Replace: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/core/types.ts`
- Create: `src/core/state.ts`
- Create: `src/core/annotator.ts`
- Create: `src/index.ts`
- Create: `tests/core/annotator.test.ts`

**Interfaces:**
- Produces: `Annotator`, `AnnotatorOptions`, `createAnnotator(options)`, `destroyAnnotator(annotator)`, `getSnapshot(annotator)`.
- Consumes: no earlier task.

- [ ] **Step 1: Replace the project configuration**

`package.json` must contain these effective fields:

```json
{
  "name": "cs-label-tool",
  "version": "2.0.0-alpha.1",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "dev": "vite demo",
    "build": "vite build && tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run typecheck && npm test && npm run build"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "typescript": "7.0.2",
    "vite": "8.1.4",
    "vitest": "4.1.10"
  },
  "engines": {
    "node": ">=22.12.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

`tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "emitDeclarationOnly": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests", "demo"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

Vite runs before declaration generation so its output cleanup cannot delete `.d.ts` files.

- [ ] **Step 2: Install the locked development toolchain**

Run: `npm install`

Expected: exit 0, updated `package-lock.json`, and no runtime `dependencies` entry.

- [ ] **Step 3: Write the failing annotator lifecycle test**

```ts
import { describe, expect, test } from 'vitest'
import { createAnnotator, destroyAnnotator, getSnapshot } from '../../src/index.js'

describe('annotator lifecycle', () => {
  test('creates isolated state and rejects use after destroy', () => {
    const container = {} as HTMLElement
    const annotator = createAnnotator({ container, historyLimit: 20 })

    expect(getSnapshot(annotator)).toMatchObject({
      revision: 0,
      annotations: [],
      labels: [],
    })

    destroyAnnotator(annotator)
    expect(() => getSnapshot(annotator)).toThrowError(/destroyed/i)
  })
})
```

- [ ] **Step 4: Run the focused test and verify RED**

Run: `npm test -- tests/core/annotator.test.ts`

Expected: FAIL because `src/index.ts` or the lifecycle exports do not exist.

- [ ] **Step 5: Implement the minimal opaque context**

Define public types without exposing writable state:

```ts
export interface AnnotatorOptions {
  container: HTMLElement
  historyLimit?: number
}

declare const annotatorBrand: unique symbol

export interface Annotator {
  readonly [annotatorBrand]: true
}

export interface AnnotationSnapshot {
  readonly schemaVersion: 1
  readonly revision: number
  readonly annotations: readonly Annotation[]
  readonly labels: readonly LabelDefinition[]
}
```

Use an internal `WeakMap<Annotator, InternalState>` in `annotator.ts`. `createAnnotator()` creates independent state; `destroyAnnotator()` marks it destroyed and removes resources; `getSnapshot()` returns immutable copies and throws `AnnotatorError` with code `ANNOTATOR_DESTROYED` after destruction.

- [ ] **Step 6: Run baseline verification and commit**

Run: `npm test -- tests/core/annotator.test.ts && npm run typecheck && npm run build`

Expected: all commands exit 0 and `dist/index.js` plus `dist/index.d.ts` exist.

Commit:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.build.json vite.config.ts vitest.config.ts src tests/core/annotator.test.ts
git commit -m "build: establish TypeScript annotation library baseline"
```

## Task 2: Implement Lossless Geometry and Viewport Transforms

**Files:**
- Create: `src/geometry/types.ts`
- Create: `src/geometry/matrix.ts`
- Create: `src/geometry/rect.ts`
- Create: `src/geometry/polygon.ts`
- Create: `src/viewport/viewport.ts`
- Create: `tests/geometry/geometry.test.ts`
- Create: `tests/viewport/viewport.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Point`, `Bounds`, `Matrix2D`, `normalizeRect`, `pointInRect`, `pointInPolygon`, `createViewport`, `imageToScreen`, `screenToImage`, `zoomAt`, `panViewport`, `fitViewport`.
- Consumes: public scalar types from Task 1.

- [ ] **Step 1: Write failing geometry and round-trip tests**

```ts
import { expect, test } from 'vitest'
import {
  createViewport,
  imageToScreen,
  normalizeRect,
  screenToImage,
  zoomAt,
} from '../../src/index.js'

test('normalizes rectangles drawn in reverse', () => {
  expect(normalizeRect({ x: 100, y: 80 }, { x: 20, y: 30 })).toEqual({
    x: 20,
    y: 30,
    width: 80,
    height: 50,
  })
})

test('round-trips original coordinates after pointer-centered zoom', () => {
  const initial = createViewport({ width: 1200, height: 800 })
  const zoomed = zoomAt(initial, { x: 600, y: 400 }, 3.25)
  const imagePoint = { x: 18234.5, y: 9601.25 }

  const restored = screenToImage(zoomed, imageToScreen(zoomed, imagePoint))

  expect(restored.x).toBeCloseTo(imagePoint.x, 10)
  expect(restored.y).toBeCloseTo(imagePoint.y, 10)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/geometry/geometry.test.ts tests/viewport/viewport.test.ts`

Expected: FAIL with missing geometry and viewport exports.

- [ ] **Step 3: Implement immutable geometry and viewport functions**

Use this affine representation:

```ts
export interface Matrix2D {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly d: number
  readonly e: number
  readonly f: number
}

export interface ViewportState {
  readonly width: number
  readonly height: number
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
  readonly minScale: number
  readonly maxScale: number
}
```

All functions return new values. `zoomAt()` clamps scale and preserves the image coordinate underneath the supplied screen point. `fitViewport()` uses `Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight)` and centers the image. Reject non-finite numbers and non-positive dimensions with `INVALID_GEOMETRY`.

- [ ] **Step 4: Add polygon validity and hit-testing tests**

```ts
import { expect, test } from 'vitest'
import { pointInPolygon, validatePolygon } from '../../src/index.js'

test('detects points inside a simple polygon', () => {
  const polygon = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }]
  expect(pointInPolygon({ x: 50, y: 30 }, polygon)).toBe(true)
  expect(pointInPolygon({ x: 90, y: 90 }, polygon)).toBe(false)
})

test('rejects polygons with fewer than three unique points', () => {
  expect(validatePolygon([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toEqual({
    valid: false,
    reason: 'TOO_FEW_POINTS',
  })
})
```

- [ ] **Step 5: Run full task verification and commit**

Run: `npm test -- tests/geometry tests/viewport && npm run typecheck`

Expected: all geometry and viewport tests pass with no TypeScript errors.

Commit:

```bash
git add src/geometry src/viewport src/index.ts tests/geometry tests/viewport
git commit -m "feat: add lossless geometry and viewport transforms"
```

## Task 3: Add Typed Events, Labels, Commands, and Bounded History

**Files:**
- Create: `src/core/events.ts`
- Create: `src/core/commands.ts`
- Create: `src/labels/labels.ts`
- Create: `tests/core/commands.test.ts`
- Create: `tests/core/events.test.ts`
- Modify: `src/core/types.ts`
- Modify: `src/core/state.ts`
- Modify: `src/core/annotator.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `subscribe`, `addLabel`, `setActiveLabel`, `addRect`, `addPolygon`, `updateAnnotation`, `removeAnnotation`, `undo`, `redo`, `canUndo`, `canRedo`.
- Consumes: `Annotator` from Task 1 and geometry validation from Task 2.

- [ ] **Step 1: Write failing command/history tests**

```ts
import { expect, test } from 'vitest'
import {
  addLabel,
  addRect,
  canRedo,
  canUndo,
  createAnnotator,
  getSnapshot,
  redo,
  undo,
} from '../../src/index.js'

test('adds a rectangle and reverses it through bounded history', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement, historyLimit: 2 })
  addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
  const id = addRect(annotator, {
    labelId: 'person', x: 10, y: 20, width: 30, height: 40,
  })

  expect(getSnapshot(annotator).annotations[0]?.id).toBe(id)
  expect(canUndo(annotator)).toBe(true)
  undo(annotator)
  expect(getSnapshot(annotator).annotations).toHaveLength(0)
  expect(canRedo(annotator)).toBe(true)
  redo(annotator)
  expect(getSnapshot(annotator).annotations).toHaveLength(1)
})
```

- [ ] **Step 2: Run command tests and verify RED**

Run: `npm test -- tests/core/commands.test.ts`

Expected: FAIL because label, annotation, and history functions are missing.

- [ ] **Step 3: Implement immutable command transactions**

Use this annotation union for Milestone 1:

```ts
export type Annotation = RectAnnotation | PolygonAnnotation

export interface RectAnnotation extends AnnotationBase {
  readonly geometry: Readonly<RectGeometry>
}

export interface PolygonAnnotation extends AnnotationBase {
  readonly geometry: Readonly<PolygonGeometry>
}
```

Each command returns `{ nextState, inverse, dirtyBounds }`. `executeCommand()` validates the complete result before replacing state, increments revision once, clears redo after a new command, and truncates the oldest history entries above `historyLimit`. Label commands are domain commands. Annotation creation rejects unknown labels and invalid geometry atomically.

- [ ] **Step 4: Write failing isolated-subscriber test**

```ts
import { expect, test } from 'vitest'
import { addLabel, createAnnotator, subscribe } from '../../src/index.js'

test('continues delivering events when one subscriber throws', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  const received: string[] = []
  subscribe(annotator, 'change', () => { throw new Error('consumer failure') })
  subscribe(annotator, 'change', event => received.push(event.kind))

  addLabel(annotator, { id: 'car', name: 'Car', color: '#1677ff' })

  expect(received).toEqual(['label:add'])
})
```

- [ ] **Step 5: Implement typed subscriptions and lifecycle cleanup**

`subscribe()` returns an idempotent unsubscribe function. Deliver listeners from a copied set in registration order; catch consumer errors and emit an `error` event with code `SUBSCRIBER_ERROR` without recursively re-emitting if an error listener throws. `destroyAnnotator()` clears all subscriber sets.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/core && npm run typecheck`

Expected: all core tests pass, including lifecycle, events, commands, undo, and redo.

Commit:

```bash
git add src/core src/labels src/index.ts tests/core
git commit -m "feat: add commands labels events and bounded history"
```

## Task 4: Add the Original-Coordinate Spatial Grid

**Files:**
- Create: `src/spatial/grid-index.ts`
- Create: `tests/spatial/grid-index.test.ts`
- Modify: `src/core/commands.ts`
- Modify: `src/core/state.ts`

**Interfaces:**
- Produces: `createGridIndex(cellSize)`, `insertSpatialItem`, `updateSpatialItem`, `removeSpatialItem`, `querySpatialBounds`.
- Consumes: `Bounds` from Task 2 and annotation command dirty bounds from Task 3.

- [ ] **Step 1: Write the failing visibility-query test**

```ts
import { expect, test } from 'vitest'
import {
  createGridIndex,
  insertSpatialItem,
  querySpatialBounds,
} from '../../src/spatial/grid-index.js'

test('returns only items intersecting queried original-coordinate cells', () => {
  let index = createGridIndex(256)
  index = insertSpatialItem(index, 'visible', { x: 20, y: 20, width: 40, height: 40 })
  index = insertSpatialItem(index, 'far', { x: 20_000, y: 20_000, width: 40, height: 40 })

  expect(querySpatialBounds(index, { x: 0, y: 0, width: 500, height: 500 }))
    .toEqual(['visible'])
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/spatial/grid-index.test.ts`

Expected: FAIL because the spatial module does not exist.

- [ ] **Step 3: Implement an immutable uniform-grid index**

The index maps integer cell keys to annotation ID sets and retains each ID's occupied cell keys for efficient updates. Queries deduplicate IDs and perform final bounds intersection before returning IDs in insertion order. Reject a non-positive cell size. Commands update the index in the same atomic transaction as annotation state.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/spatial tests/core && npm run typecheck`

Expected: all tests pass and command undo/redo leaves the index consistent.

Commit:

```bash
git add src/spatial src/core tests/spatial tests/core
git commit -m "feat: index annotations in original coordinates"
```

## Task 5: Create Standard Image Loading and Viewport-Sized Canvas Rendering

**Files:**
- Create: `src/image/types.ts`
- Create: `src/image/standard-source.ts`
- Create: `src/render/canvas-layers.ts`
- Create: `src/render/scheduler.ts`
- Create: `src/render/canvas-renderer.ts`
- Create: `tests/render/scheduler.test.ts`
- Create: `tests/browser/renderer.spec.ts`
- Create: `tests/fixtures/renderer.html`
- Create: `playwright.config.ts`
- Modify: `src/core/annotator.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `ImageSource`, `createStandardImageSource(input)`, `setImageSource`, `resizeViewport`, `fitToScreen`, `zoomTo`, `panBy`, `imageToClient`, `clientToImage`.
- Consumes: context lifecycle, viewport transforms, spatial query, annotations, and labels from Tasks 1-4.

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'vite --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], deviceScaleFactor: 2 } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 2 } },
  ],
})
```

- [ ] **Step 1: Write the failing scheduler test**

```ts
import { expect, test, vi } from 'vitest'
import { createRenderScheduler } from '../../src/render/scheduler.js'

test('coalesces repeated invalidations into one frame', () => {
  let queued: FrameRequestCallback | undefined
  const render = vi.fn()
  const scheduler = createRenderScheduler({
    requestFrame: callback => { queued = callback; return 1 },
    cancelFrame: () => undefined,
    render,
  })

  scheduler.invalidate('annotations')
  scheduler.invalidate('interaction')
  expect(render).not.toHaveBeenCalled()
  queued?.(16)
  expect(render).toHaveBeenCalledTimes(1)
  expect(render).toHaveBeenCalledWith(new Set(['annotations', 'interaction']))
})
```

- [ ] **Step 2: Verify scheduler RED, then implement it**

Run: `npm test -- tests/render/scheduler.test.ts`

Expected before implementation: FAIL due to missing scheduler. Implement one pending frame, merged layer names, and an idempotent `destroy()` that cancels the frame. Re-run and expect PASS.

- [ ] **Step 3: Write a failing browser renderer test**

```ts
import { expect, test } from '@playwright/test'

test('uses viewport-sized DPR canvas and redraws after fit', async ({ page }) => {
  await page.goto('/tests/fixtures/renderer.html')
  const result = await page.locator('canvas[data-layer="annotations"]').evaluate(canvas => ({
    cssWidth: canvas.clientWidth,
    cssHeight: canvas.clientHeight,
    width: canvas.width,
    height: canvas.height,
  }))

  expect(result).toEqual({ cssWidth: 800, cssHeight: 600, width: 1600, height: 1200 })
})
```

`tests/fixtures/renderer.html` contains an `800 × 600` container and a module script that creates an annotator, loads this deterministic SVG data URL through `createStandardImageSource()`, and calls `fitToScreen()`:

```html
<!doctype html>
<html lang="en">
  <body style="margin:0">
    <div id="app" style="width:800px;height:600px"></div>
    <script type="module">
      import { createAnnotator, createStandardImageSource, fitToScreen, setImageSource } from '/src/index.ts'
      const annotator = createAnnotator({ container: document.querySelector('#app') })
      const image = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="white"/></svg>'
      await setImageSource(annotator, createStandardImageSource(image))
      fitToScreen(annotator)
    </script>
  </body>
</html>
```

Playwright config runs this project with `deviceScaleFactor: 2`.

- [ ] **Step 4: Run the browser test and verify RED**

Run: `npm run test:e2e -- tests/browser/renderer.spec.ts`

Expected: FAIL because renderer layers and fixture are missing.

- [ ] **Step 5: Implement image loading, Canvas layers, and rendering**

`ImageSource` exposes `id`, `width`, `height`, `load(signal): Promise<CanvasImageSource>`, and `dispose()`. The renderer creates four absolute Canvas elements with `data-layer` values `image`, `annotations`, `interaction`, and `event`; backing dimensions equal rounded CSS dimensions times DPR. Paint visible annotations returned by the spatial index after applying the current transform. `destroyAnnotator()` cancels image loading, cancels scheduled frames, removes layers, and disposes the source.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run test:e2e -- tests/browser/renderer.spec.ts && npm run typecheck`

Expected: unit and renderer tests pass with no browser console errors.

Commit:

```bash
git add src/image src/render src/core src/index.ts tests/render tests/browser playwright.config.ts
git commit -m "feat: render images and annotations on viewport canvas layers"
```

## Task 6: Implement Scoped Tool Control and Rectangle Drawing

**Files:**
- Create: `src/tools/types.ts`
- Create: `src/tools/controller.ts`
- Create: `src/tools/rect-tool.ts`
- Create: `tests/tools/rect-tool.test.ts`
- Create: `tests/browser/rect-tool.spec.ts`
- Create: `tests/fixtures/tools.html`
- Modify: `src/core/annotator.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `Tool`, `NormalizedPointerEvent`, `activateTool`, `useRect`, `cancelActiveGesture`.
- Consumes: coordinate conversion, `addRect`, active label, renderer invalidation, and event Canvas from Tasks 2-5.

- [ ] **Step 1: Write the failing rectangle state-machine test**

```ts
import { expect, test } from 'vitest'
import { createRectToolState, reduceRectTool } from '../../src/tools/rect-tool.js'

test('creates a normalized rectangle from an up-left drag', () => {
  let state = createRectToolState()
  state = reduceRectTool(state, { type: 'down', imagePoint: { x: 100, y: 80 }, pointerId: 1 })
  state = reduceRectTool(state, { type: 'move', imagePoint: { x: 20, y: 30 }, pointerId: 1 })
  const result = reduceRectTool(state, { type: 'up', imagePoint: { x: 20, y: 30 }, pointerId: 1 })

  expect(result.commit).toEqual({ x: 20, y: 30, width: 80, height: 50 })
  expect(result.state.phase).toBe('idle')
})
```

- [ ] **Step 2: Verify RED, then implement the pure rectangle reducer**

Run: `npm test -- tests/tools/rect-tool.test.ts`

Expected before implementation: FAIL due to missing module. Implement `idle` and `drawing` phases, matching pointer IDs, minimum image-space size, Escape cancellation, and no domain mutation inside the reducer. Re-run and expect PASS.

- [ ] **Step 3: Write failing Pointer Events integration test**

```ts
import { expect, test } from '@playwright/test'

test('finishes a rectangle after the pointer leaves the viewport', async ({ page }) => {
  await page.goto('/tests/fixtures/tools.html')
  await page.getByRole('button', { name: 'Rectangle' }).click()
  const canvas = page.locator('canvas[data-layer="event"]')
  await canvas.dispatchEvent('pointerdown', { pointerId: 7, clientX: 300, clientY: 250, buttons: 1 })
  await page.mouse.move(900, 700)
  await page.mouse.up()

  const count = await page.evaluate(() => window.getTestSnapshot().annotations.length)
  expect(count).toBe(1)
})
```

`tests/fixtures/tools.html` loads the same deterministic image as the renderer fixture, registers a `person` label, exposes `window.getTestSnapshot = () => getSnapshot(annotator)`, and renders semantic buttons that call `useSelect()`, `useRect()`, and `usePolygon()`.

- [ ] **Step 4: Implement controller binding and `useRect()`**

Bind `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, and scoped `keydown` with `addEventListener`. Capture the active pointer on down. Convert client coordinates through the inverse viewport transform. Draft updates invalidate only the interaction layer. Valid completion dispatches `addRect()` using the active label; invalid or canceled gestures clear the draft. Never assign `window.on*`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/tools && npm run test:e2e -- tests/browser/rect-tool.spec.ts && npm run typecheck`

Expected: reducer and pointer-capture flow pass.

Commit:

```bash
git add src/tools src/core src/index.ts tests/tools tests/browser
git commit -m "feat: add functional rectangle drawing tool"
```

## Task 7: Add Polygon Creation, Selection, and Editing

**Files:**
- Create: `src/tools/polygon-tool.ts`
- Create: `src/tools/select-tool.ts`
- Create: `tests/tools/polygon-tool.test.ts`
- Create: `tests/tools/select-tool.test.ts`
- Create: `tests/browser/vector-editing.spec.ts`
- Modify: `src/tools/controller.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `usePolygon`, `useSelect`, `selectAnnotation`, `clearSelection`, `getSelection`, `updateRectGeometry`, `updatePolygonGeometry`.
- Consumes: commands, polygon validation, hit testing, spatial queries, viewport conversion, and rendering.

- [ ] **Step 1: Write failing polygon reducer tests**

```ts
import { expect, test } from 'vitest'
import { createPolygonToolState, reducePolygonTool } from '../../src/tools/polygon-tool.js'

test('commits three unique points and resets after Enter', () => {
  let state = createPolygonToolState()
  state = reducePolygonTool(state, { type: 'point', imagePoint: { x: 0, y: 0 } })
  state = reducePolygonTool(state, { type: 'point', imagePoint: { x: 100, y: 0 } })
  state = reducePolygonTool(state, { type: 'point', imagePoint: { x: 50, y: 100 } })
  const result = reducePolygonTool(state, { type: 'commit' })

  expect(result.commit).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }])
  expect(result.state.points).toEqual([])
})
```

- [ ] **Step 2: Verify RED and implement polygon authoring**

Run: `npm test -- tests/tools/polygon-tool.test.ts`

Expected before implementation: FAIL. Implement click-to-add, Backspace removal, Enter/double-click close, Escape cancel, duplicate-point rejection, and final `validatePolygon()` before dispatching `addPolygon()`. Re-run and expect PASS.

- [ ] **Step 3: Write failing selection/edit reducer tests**

```ts
import { expect, test } from 'vitest'
import { moveRect, movePolygonVertex } from '../../src/tools/select-tool.js'

test('moves vector geometry in original-image coordinates', () => {
  expect(moveRect({ x: 10, y: 20, width: 30, height: 40 }, { x: 5, y: -2 }))
    .toEqual({ x: 15, y: 18, width: 30, height: 40 })
  expect(movePolygonVertex(
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }],
    1,
    { x: 12, y: 3 },
  )[1]).toEqual({ x: 12, y: 3 })
})
```

- [ ] **Step 4: Implement precise hit testing and edit transactions**

Selection queries a screen-tolerance-expanded original-coordinate bounds from the spatial index, tests handles first, then polygon edges/interiors and rectangle edges/interiors, and chooses the visually topmost match. A drag uses a draft geometry and creates one update command on pointer up. Rectangle editing exposes eight handles; polygon editing exposes vertices. Delete removes the selected annotation. Escape restores pre-drag geometry.

- [ ] **Step 5: Add and pass browser editing flow**

The browser test creates one rectangle and polygon through public functions, selects each through pointer input, moves the rectangle, moves one polygon vertex, performs undo/redo, and asserts snapshots remain in original-image coordinates after zooming to `2.5`.

Run: `npm test -- tests/tools && npm run test:e2e -- tests/browser/vector-editing.spec.ts && npm run typecheck`

Expected: all vector tool and editing flows pass.

- [ ] **Step 6: Commit**

```bash
git add src/tools src/index.ts tests/tools tests/browser
git commit -m "feat: add polygon authoring and vector editing"
```

## Task 8: Add Ergonomic APIs and the Default Web Component

**Files:**
- Create: `src/components/styles.ts`
- Create: `src/components/annotator-element.ts`
- Create: `src/components/define.ts`
- Create: `tests/browser/component.spec.ts`
- Create: `tests/fixtures/component.html`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `defineAnnotatorElements()`, `CSAnnotatorElement`, `mountAnnotator(target, options)`, `unmountAnnotator(target)`.
- Consumes: the complete public context and tool APIs from Tasks 1-7.

- [ ] **Step 1: Write the failing default-component browser test**

```ts
import { expect, test } from '@playwright/test'

test('mounts an accessible default UI and activates tools with one click', async ({ page }) => {
  await page.goto('/tests/fixtures/component.html')
  const editor = page.locator('cs-annotator')

  await expect(editor.getByRole('toolbar', { name: 'Annotation tools' })).toBeVisible()
  await editor.getByRole('button', { name: 'Rectangle' }).click()
  await expect(editor.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'true')
  await expect(editor.locator('canvas[data-layer="event"]')).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:e2e -- tests/browser/component.spec.ts`

Expected: FAIL because the custom element is not defined.

`tests/fixtures/component.html` calls `mountAnnotator('#app', { historyLimit: 100 })`, stores the returned opaque context in `window.testAnnotator`, and exposes `window.unmountTestAnnotator = () => unmountAnnotator('#app')`. It does not access internal state.

- [ ] **Step 3: Implement idempotent element registration and mounting**

`defineAnnotatorElements()` calls `customElements.define('cs-annotator', CSAnnotatorElement)` only when not already registered. `mountAnnotator()` accepts a selector or element, defines components, creates a `cs-annotator`, assigns typed options through a property, appends it, and returns its `Annotator`. `unmountAnnotator()` calls `destroyAnnotator()` before removal.

The Shadow DOM contains a labeled toolbar, viewport region, label list, undo/redo, zoom, fit, rectangle, polygon, and select controls. Buttons expose `aria-pressed` or disabled state from subscriptions. CSS exposes named `part` attributes and custom properties without making color the only active-state indicator.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:e2e -- tests/browser/component.spec.ts && npm test && npm run typecheck`

Expected: component, unit, and type checks pass.

Commit:

```bash
git add src/components src/index.ts tests/browser
git commit -m "feat: add native annotation web component"
```

## Task 9: Publishable Demo, Lifecycle Hardening, and Legacy Cleanup

**Files:**
- Create: `demo/index.html`
- Create: `demo/main.ts`
- Create: `tests/browser/lifecycle.spec.ts`
- Modify: `README.md`
- Modify: `.gitignore`
- Delete: `PropxDemo01.html`
- Delete: `js/compiler.js`
- Delete: `js/observer.js`
- Delete: `js/vnode.js`
- Delete: `js/reactive/effect.js`
- Delete: `js/reactive/vue.js`
- Delete: tracked prototype files under `dist/`
- Modify: `index.html` to redirect developers to the Vite demo or replace it with the demo entry.

**Interfaces:**
- Produces: runnable integration example and clean package surface.
- Consumes: all Milestone 1 public functions.

- [ ] **Step 1: Write the failing lifecycle browser test**

```ts
import { expect, test } from '@playwright/test'

test('removes canvases and stops reactions after unmount', async ({ page }) => {
  await page.goto('/tests/fixtures/component.html')
  const result = await page.evaluate(() => {
    const annotator = window.testAnnotator
    window.unmountTestAnnotator()
    let destroyed = false
    try {
      window.getTestSnapshot(annotator)
    } catch (error) {
      destroyed = error instanceof Error && /destroyed/i.test(error.message)
    }
    return { destroyed }
  })

  await expect(page.locator('cs-annotator')).toHaveCount(0)
  await expect(page.locator('canvas[data-layer]')).toHaveCount(0)
  expect(result.destroyed).toBe(true)
})
```

- [ ] **Step 2: Verify RED and close lifecycle gaps**

Run: `npm run test:e2e -- tests/browser/lifecycle.spec.ts`

Expected before cleanup: FAIL with at least one retained resource count. Track removers and cancelers in the opaque context, make destroy idempotent, and ensure component disconnect delegates to unmount exactly once. Re-run until PASS.

- [ ] **Step 3: Replace the prototype demo and document the public API**

The demo must use only root package exports and include:

```ts
import {
  addLabel,
  mountAnnotator,
  setImageSource,
  createStandardImageSource,
} from '../src/index.js'

const annotator = mountAnnotator('#app', { historyLimit: 100 })
addLabel(annotator, { id: 'person', name: 'Person', color: '#ff4d4f' })
await setImageSource(annotator, createStandardImageSource('../a.webp'))
```

README must document installation, browser support, the five one-line tool calls, programmatic rectangle/polygon creation, subscriptions, undo/redo, destroy, coordinate guarantees, and explicitly list Mask/AI/COCO/YOLO as later milestones.

- [ ] **Step 4: Remove replaced prototype implementation files**

Delete the old runtime files listed above only after the demo imports the TypeScript entry and the complete verification command passes once. Keep `a.webp` and `public/favicon.ico` as demo assets.

- [ ] **Step 5: Run final Milestone 1 verification**

Run:

```bash
npm run check
npm run test:e2e
git diff --check
```

Expected: unit tests, typecheck, library build, Chromium/Firefox/WebKit browser tests, and whitespace validation all exit 0. `npm ls --omit=dev --depth=0` reports no runtime dependencies.

- [ ] **Step 6: Commit the independently usable milestone**

```bash
git add README.md .gitignore index.html demo src tests package.json package-lock.json tsconfig.json tsconfig.build.json vite.config.ts vitest.config.ts playwright.config.ts
git add -u PropxDemo01.html js dist
git commit -m "feat: deliver vector annotation engine milestone"
```

## Plan Self-Review Record

- Spec coverage: Milestone 1 design sections 3-10, 13, 16-18 are covered. Tile pyramids, Mask, AI, formats, snapshots beyond the base schema, and autosave intentionally move to Milestones 2-4.
- Placeholder scan: no deferred implementation wording is used inside Milestone 1 tasks.
- Type consistency: all public mutation functions accept `Annotator`; geometry remains in original-image coordinates; tools call the same commands as programmatic APIs; Web Components consume only public functions.
- Verification boundary: completion requires unit, type, build, browser, dependency, lifecycle, and whitespace checks.

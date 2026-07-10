# AI Annotation Library Design

**Date:** 2026-07-10

**Status:** Approved design pending written-spec review

## 1. Purpose

Refactor `cs-label-tool` into a production-oriented frontend JavaScript library designed specifically for AI-assisted image annotation software. The implementation uses TypeScript and browser-native APIs without runtime framework dependencies.

The library provides both:

- A headless annotation engine with functional APIs.
- Optional native Web Components for a usable default annotation interface.

It is not a generic drawing library. AI suggestions, model provenance, human review, feedback export, large-image rendering, instance masks, and annotation format conversion are first-class capabilities.

## 2. Scope

### 2.1 Included

- Standard images loaded from URL, `Blob`, or `ImageBitmap`.
- Extremely large images loaded through a pluggable tile/pyramid image source.
- Viewport zoom, pan, fit-to-screen, and coordinate conversion.
- Rectangle and polygon instance annotations.
- Selection, movement, resizing, vertex editing, and deletion.
- Label definitions, visibility, and active-label management.
- Brush and eraser tools for per-instance masks.
- Undo and redo for manual and batch operations.
- Debounced auto-save callbacks controlled by the host application.
- Pluggable AI inference providers.
- Suggested, accepted, rejected, and modified AI review states.
- Confidence filtering and batch confirmation.
- AI feedback and model provenance export.
- COCO detection, polygon segmentation, and RLE mask import/export.
- YOLO detection and polygon segmentation import/export.
- Versioned snapshots, validation, and in-memory recovery APIs.
- Optional native Web Components for toolbar, viewport, labels, and AI review controls.

### 2.2 Excluded

- User accounts, authentication, and permissions.
- Dataset and task assignment backends.
- Server-side persistence.
- IndexedDB or other durable browser persistence.
- Training pipelines and model hosting.
- Keypoints, rotated boxes, semantic segmentation, audio, and video annotation.
- Internet Explorer and legacy browser bundles.

## 3. Compatibility and Packaging

- TypeScript is the implementation language.
- The package has zero runtime dependencies.
- Browser support is the latest two major versions of Chrome, Edge, and Firefox, plus Safari 17 and newer.
- Distribution is ESM-only with TypeScript declarations and source maps.
- Public modules support tree shaking and subpath imports.
- Build and test dependencies may include TypeScript, Vite library mode, Vitest, and Playwright.
- The package exposes a stable root API and marks internal modules as non-public.

## 4. Public API Principles

The public API is functional. Callers create an opaque annotator context and pass it explicitly to command functions. Consumers do not subclass engine classes or mutate internal state.

```ts
const annotator = createAnnotator({
  container,
  imageSource,
  labels,
  onAutoSave,
})

useRect(annotator, { labelId: 'person' })
usePolygon(annotator, { labelId: 'vehicle' })
useBrush(annotator, { labelId: 'person', size: 24 })
undo(annotator)
fitToScreen(annotator)
```

The API provides three levels of use:

1. `mountAnnotator()` mounts the complete default Web Component UI with sensible defaults.
2. `createAnnotator()` plus convenience functions provides a headless functional API.
3. Advanced adapters allow replacement of image sources, AI providers, renderers, and save callbacks.

Common actions require one function call. Advanced engine concepts are not required for standard integration. Every public function has explicit input and return types, stable structured errors, examples, and development-mode argument diagnostics.

## 5. Source Structure

```text
src/
├── core/          State, commands, events, transactions, history, snapshots
├── geometry/      Matrices, rectangles, polygons, bounds, hit testing
├── viewport/      Zoom, pan, fit, and coordinate conversion
├── image/         Standard image and tile/pyramid source adapters
├── render/        Canvas layers, frame scheduling, dirty-region rendering
├── spatial/       Original-coordinate spatial indexing
├── tools/         Select, rectangle, polygon, brush, and eraser tools
├── mask/          Mask tiles, painting, composition, and RLE
├── labels/        Label state, color, visibility, and selection
├── ai/            Provider contracts, inference lifecycle, review workflow
├── formats/       Snapshot, COCO, YOLO, validation, and diagnostics
├── components/    Optional native Web Components
└── index.ts       Stable public exports
```

Each module has one clear responsibility and communicates using exported types. There are no global annotator instances, global tool variables, or `window.on*` assignments.

## 6. State and Annotation Model

The original image coordinate system is the single source of truth. Canvas coordinates are derived for display and never persisted as annotation geometry.

```ts
type Annotation = RectAnnotation | PolygonAnnotation | MaskAnnotation

interface AnnotationBase {
  id: string
  labelId: string
  source: 'manual' | 'ai'
  status: 'suggested' | 'accepted' | 'rejected' | 'modified'
  confidence?: number
  model?: {
    name: string
    version: string
    requestId?: string
  }
  revision: number
  createdAt: number
  updatedAt: number
  metadata: Record<string, unknown>
}

interface RectGeometry {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

interface PolygonGeometry {
  type: 'polygon'
  points: readonly (readonly [number, number])[]
}

interface MaskGeometry {
  type: 'mask'
  imageWidth: number
  imageHeight: number
  tileSize: number
  tiles: ReadonlyMap<string, MaskTile>
}
```

State is separated into:

- Domain state: image metadata, labels, annotations, AI suggestions, model information, review records, and revision.
- Interaction state: viewport, active tool, hover, selection, keyboard modifiers, and in-progress drafts.

Interaction state is excluded from COCO, YOLO, and durable snapshots unless explicitly needed to restore an interrupted in-memory drawing operation.

## 7. Commands, Transactions, and History

All domain mutations pass through commands. Commands validate input, calculate inverse data, update indexes, identify dirty render regions, and emit events.

```text
Pointer event
→ active tool
→ domain command
→ validation and clipping
→ atomic state transaction
→ history and review record
→ spatial-index update
→ dirty-region invalidation
→ frame rendering
→ change and auto-save events
```

- A failed command leaves state and history unchanged.
- Undo and redo operate on domain commands rather than rendered pixels.
- AI batch acceptance is one transaction and one undo step.
- Mask painting records only changed tiles and their before/after data.
- History capacity is configurable and bounded in memory.
- State revisions increase monotonically after successful domain transactions.

## 8. Rendering Architecture

The default renderer uses layered Canvas 2D surfaces and optional `OffscreenCanvas`. Canvas is a display mechanism, not the annotation store.

```text
image-layer        Visible image or pyramid tiles
annotation-layer   Completed boxes, polygons, and masks
interaction-layer  Drafts, hover, selection, handles, and guides
event-layer        Transparent Pointer Events surface
```

Each Canvas is limited to viewport dimensions multiplied by `devicePixelRatio`. The renderer never allocates a Canvas with full large-image dimensions.

Rendering rules:

- A single forward and inverse transform maps original-image coordinates and viewport coordinates.
- Zoom and pan update the viewport transform without changing annotation geometry.
- `requestAnimationFrame` merges repeated invalidations.
- Dirty regions restrict redraw work during edits.
- A spatial index returns only annotations intersecting the visible original-coordinate bounds.
- Coarse spatial candidates receive exact geometry hit testing.
- Only selected annotations render editing handles.
- `OffscreenCanvas` accelerates mask composition when supported; a Canvas 2D fallback has equivalent output.
- Image tiles use cancellable requests, visible-first priority, and a configurable in-memory LRU budget.
- Renderer loss or recreation produces a full redraw from domain state.

Screen antialiasing may affect visual edges but never exported vector geometry. Mask exports read source mask tiles rather than screen pixels.

## 9. Image Sources

`ImageSourceAdapter` provides a unified original-coordinate image space.

Two implementations are part of the library:

- Standard source: URL, `Blob`, or `ImageBitmap` for images that browsers can decode as a whole.
- Pyramid source contract: a pluggable adapter that supplies metadata, levels, and viewport-relevant tiles for extremely large images.

The engine does not impose a fixed source-image dimension limit. Practical limits are controlled by tile availability, configured memory budgets, browser resources, and host hardware.

Changing an image source cancels obsolete tile requests and AI inference. Results carrying an outdated image ID or image revision are rejected as stale.

## 10. Drawing Tools

Tools translate Pointer Events and keyboard actions into commands. They do not mutate Canvas or domain state directly.

```ts
useSelect(annotator)
useRect(annotator, { labelId })
usePolygon(annotator, { labelId })
useBrush(annotator, { labelId, size: 24 })
useEraser(annotator, { size: 32 })
```

- Pointer capture guarantees a drawing gesture completes when the pointer leaves the viewport.
- Rectangle creation works in all drag directions.
- Rectangles support movement and eight resize handles.
- Polygon creation supports add, remove, close, and cancel operations.
- Polygon editing supports vertex movement and deletion while preserving validity.
- Selection uses spatial coarse filtering followed by exact shape tests.
- Zoom is centered on the pointer position.
- Pan and zoom never mutate annotation geometry.
- Switching tools commits a valid draft or cancels an invalid draft according to explicit tool policy.
- Keyboard shortcuts are configurable and scoped to the focused annotator.

Programmatic annotation functions use the same commands:

```ts
const id = addRect(annotator, {
  labelId: 'person',
  x: 100,
  y: 80,
  width: 300,
  height: 500,
})

selectAnnotation(annotator, id)
removeAnnotation(annotator, id)
```

## 11. Instance Mask Design

Instance masks use fixed original-resolution tiles. The default tile size is `256 × 256` pixels.

- Each mask annotation owns its tile set, allowing overlapping instances.
- Tiles store compact binary mask data instead of Base64 images.
- Brush operations update only intersected tiles.
- Eraser operations clear only the active mask instance.
- A stroke is one history command, even when it changes multiple tiles.
- Screen rendering may use cached downsampled representations.
- Editing and export always use original-resolution tile data.
- Nearest-neighbor sampling prevents categorical boundary interpolation.
- COCO RLE generation streams from source tiles without constructing a full-image Canvas.
- Snapshot serialization supports compact binary and RLE tile encodings.

## 12. AI Provider and Review Workflow

AI inference is provided through a host-supplied adapter:

```ts
interface AIProvider {
  infer(
    request: AIInferenceRequest,
    context: AIInferenceContext,
  ): AsyncIterable<AIInferenceEvent>
}
```

`AsyncIterable` supports immediate REST results, job polling, and streaming providers without changing the engine API.

```ts
setAIProvider(annotator, provider)

const task = requestAIAnnotations(annotator, {
  confidence: 0.6,
  timeout: 60_000,
})

cancelAIInference(task)
```

AI behavior:

- Every request carries image ID, image revision, request ID, and cancellation signal.
- Returned labels, coordinates, polygons, mask dimensions, confidence, and model metadata are validated.
- Stale or malformed results do not mutate annotations.
- Confidence filters affect visibility without deleting suggestions.
- Suggestions are visually distinct from accepted and manually modified annotations.
- Users can focus the next suggestion, accept, reject, modify, or batch-confirm visible suggestions.
- Rejections retain a review record and optional reason without remaining visible as annotations.
- Modifications retain the original model geometry and final human geometry.
- AI failures emit structured events and do not affect manual annotations.

`exportAIFeedback()` includes model name and version, request ID, original prediction, final geometry, review decision, rejection reason, and relevant label mapping. This enables active-learning and model-quality workflows in the host product.

## 13. Default AI Annotation UI

`mountAnnotator()` creates optional Web Components for:

- Annotation viewport.
- Tool selection and brush controls.
- Label list and active-label selection.
- Zoom and fit controls.
- Undo and redo.
- AI request state and cancellation.
- Confidence threshold filtering.
- Candidate navigation and batch confirmation.
- Visible distinction between suggestions, accepted results, and modified results.

Components call the same public functional API as headless consumers. They do not access internal state. Styling uses CSS custom properties and Shadow DOM parts so host applications can theme and rearrange the default interface.

## 14. Auto-Save and Host Integration

The library does not persist data. It generates validated snapshots and delegates storage to the host application.

```ts
const annotator = createAnnotator({
  onAutoSave: async ({ snapshot, revision, signal }) => {
    await api.save(snapshot, { signal })
  },
  autoSave: {
    debounce: 800,
    maxWait: 5_000,
  },
})
```

- At most one save callback runs concurrently.
- A newer dirty revision is saved after an older callback finishes.
- Save failure keeps the annotator dirty and emits `autosaveerror`.
- `retryAutoSave()` retries the latest dirty snapshot.
- Task switching emits `beforetaskchange`; the host decides whether to wait, cancel, or continue.
- The library makes no claim of recovery after a browser refresh unless the host stores a snapshot.

## 15. Snapshots and Format Conversion

Public functions include:

```ts
serializeSnapshot(annotator)
restoreSnapshot(annotator, snapshot)
exportCOCO(snapshot, options)
importCOCO(data, options)
exportYOLO(snapshot, options)
importYOLO(data, options)
exportAIFeedback(snapshot, options)
```

- Snapshots include `schemaVersion`, image metadata, label definitions, annotations, model provenance, review records, and domain revision.
- Restore validates schema, image dimensions, label references, geometry, mask tiles, and revision metadata before mutation.
- Import and restore are atomic: invalid input leaves current state unchanged.
- COCO bbox, polygon, and RLE preserve internal geometry and mask resolution.
- YOLO detection coordinates are normalized during export and restored using image dimensions during import.
- YOLO segmentation cannot express RLE directly. Mask-to-contour conversion uses configurable simplification and emits a diagnostic warning because the conversion can be approximate.
- Unknown labels, invalid shapes, and unsupported features produce structured diagnostics rather than silent drops.
- Schema migrations are explicit functions between known versions.

## 16. Errors and Resource Lifecycle

- Public failures use stable error codes, readable messages, and structured context.
- Commands and imports roll back atomically on failure.
- Tile failures render an error placeholder and expose retry functions.
- AI and image requests accept `AbortSignal` and are canceled on task change or destroy.
- `destroyAnnotator()` removes DOM listeners, observers, timers, animation frames, image bitmaps, object URLs, pending saves, and inference tasks.
- No component assigns global window event handlers.
- Subscribers are isolated so one failing consumer callback does not corrupt engine state.

## 17. Testing Strategy

- Unit tests cover matrices, coordinate round trips, geometry, bounds, polygon validity, hit testing, spatial indexes, reducers, commands, and transactions.
- Mask tests cover brush interpolation, tile boundaries, erasing, undo, redo, and RLE round trips.
- Golden-file tests cover supported COCO and YOLO imports and exports.
- AI contract tests cover streaming, cancellation, timeouts, malformed data, stale image revisions, and provider errors.
- DOM integration tests cover Pointer Events, pointer capture, keyboard scope, Web Component events, task switching, and destroy behavior.
- Cross-browser tests run against Chromium, Firefox, and WebKit.
- Performance benchmarks cover 10,000 vector annotations, tiled large images, confidence filtering, and continuous mask strokes.
- Lifecycle tests repeatedly create, switch, and destroy annotators to detect listener, timer, and retained-memory growth.

Test-driven development is required for all behavior. Each production behavior starts with a failing test, followed by minimal implementation and a full green test run.

## 18. Acceptance Criteria

- Common tools activate through one functional call.
- Annotation geometry survives zoom, pan, resize, snapshot, and restore without coordinate drift.
- Regular pointer feedback completes within 50 ms under the documented benchmark fixture.
- Pan and zoom query visible annotations rather than iterating every annotation.
- Canvas backing dimensions never scale to full large-image dimensions.
- A mask stroke updates only intersected `256 × 256` tiles.
- AI failure, cancellation, or stale results cannot change manual annotation state.
- Batch AI acceptance is a single undoable transaction.
- Import and restore failures cannot partially mutate state.
- COCO RLE uses original mask tiles rather than screen-rendered data.
- YOLO lossy mask conversion always produces a warning.
- Destroyed instances retain no active library listeners, requests, animation frames, or timers.
- Every public export has TypeScript declarations, runnable examples, and automated tests.

Performance frame-rate results depend on viewport size, hardware, browser, visible geometry complexity, and configured memory budgets. The repository will define a fixed benchmark fixture and reference environment so regressions are compared consistently rather than claiming an unconditional frame rate across all devices.

## 19. Delivery Milestones

### Milestone 1: Engine Baseline and Vector Annotation

- TypeScript library build and public functional API.
- Domain state, events, commands, transactions, and bounded history.
- Standard image source, viewport, and layered renderer.
- Rectangle, polygon, selection, labels, editing, undo, and redo.
- Basic Web Component viewport and controls.

### Milestone 2: Production Rendering and Masks

- Tile/pyramid image source contract.
- Spatial indexing and dirty-region rendering.
- Brush and eraser tools.
- Mask tiles, composition, history, serialization, and RLE.
- Performance and memory benchmarks.

### Milestone 3: AI Review Workflow

- `AIProvider` contract and inference lifecycle.
- Suggestions, confidence filters, candidate navigation, and review states.
- Accept, reject, modify, and batch operations.
- Model provenance, review records, and AI feedback export.
- Default AI review Web Components.

### Milestone 4: Data Loop and Hardening

- COCO and YOLO import/export.
- Versioned snapshots and migrations.
- Auto-save callback scheduling and task lifecycle.
- Cross-browser integration tests.
- API documentation, examples, performance reports, and publishable ESM artifacts.

Each milestone produces independently testable and usable software. Implementation plans may subdivide a milestone, but they must preserve the public contracts defined by this design.

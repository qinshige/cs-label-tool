# Demo Snapshot Dialog Design

## Goal

Make the demo visibly demonstrate how consumers obtain annotation results with
`getSnapshot(annotator)`, without changing the library API or replacing the
existing JSON download flow.

## User Experience

- Add a `📋 获取结果` button to the demo toolbar beside the existing import and
  export actions.
- Clicking the button obtains a fresh snapshot with `getSnapshot(annotator)` and
  formats it with `JSON.stringify(snapshot, null, 2)`.
- Display the formatted result in a native `<dialog>` containing a scrollable
  `<pre>` region.
- Provide `复制 JSON` and `关闭` buttons. `Escape` uses the native dialog close
  behavior.
- Copy success or failure uses the demo's existing toast feedback.
- Opening the dialog again always replaces its content with the newest snapshot.

## Implementation Boundaries

- Keep the change inside `demo/index.html`, `demo/main.ts`, and one Playwright
  browser test.
- Use the existing imported `getSnapshot` function; do not introduce a second
  snapshot serializer or modify core annotation state.
- Keep the existing `导出` button unchanged: it downloads JSON, while the new
  action previews and copies JSON.
- Use the native Clipboard API. If copying fails, keep the dialog open and show
  an error toast.
- Add accessible dialog labelling and explicit button labels.

## Data Flow

```text
点击“获取结果”
  -> getSnapshot(annotator)
  -> JSON.stringify(..., null, 2)
  -> 更新 <pre>
  -> dialog.showModal()
  -> 可选：navigator.clipboard.writeText(formattedJson)
```

## Verification

- A Playwright test opens the demo, creates a deterministic rectangle through
  the existing `demoTest` hook, opens the result dialog, and verifies that the
  displayed JSON contains the same annotation and geometry as `demoTest.snapshot()`.
- The test grants clipboard permission where supported, clicks `复制 JSON`, and
  verifies copied text matches the displayed JSON.
- Run TypeScript checking, unit tests, production build, and the focused browser
  test before completion.


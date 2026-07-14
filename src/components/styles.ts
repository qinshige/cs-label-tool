export const annotatorStyles = `
  :host {
    --cs-annotator-background: #101318;
    --cs-annotator-border: #2a3039;
    --cs-annotator-control: #1a2029;
    --cs-annotator-control-active: #2563eb;
    --cs-annotator-foreground: #f8fafc;
    display: block;
    width: 100%;
    height: 100%;
    color: var(--cs-annotator-foreground);
    font: 14px/1.4 system-ui, sans-serif;
  }

  [part="shell"] {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--cs-annotator-background);
  }

  [part="toolbar"] {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid var(--cs-annotator-border);
  }

  button {
    min-height: 32px;
    padding: 5px 10px;
    color: inherit;
    background: var(--cs-annotator-control);
    border: 1px solid var(--cs-annotator-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button[aria-pressed="true"] {
    background: var(--cs-annotator-control-active);
    border-color: #93c5fd;
    outline: 2px solid #ffffff;
    outline-offset: -4px;
  }

  button:focus-visible {
    outline: 2px solid #93c5fd;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  [part="workspace"] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 180px;
    min-height: 0;
  }

  [part="viewport"] {
    position: relative;
    min-width: 0;
    min-height: 0;
    background: #090b0f;
  }

  [part="labels"] {
    overflow: auto;
    padding: 8px;
    border-left: 1px solid var(--cs-annotator-border);
  }

  [part="labels"] button {
    display: block;
    width: 100%;
    margin-bottom: 6px;
    text-align: left;
  }
`

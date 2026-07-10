import {
  canRedo,
  canUndo,
  redo,
  undo,
} from '../core/commands.js'
import {
  createAnnotator,
  destroyAnnotator,
  getSnapshot,
} from '../core/annotator.js'
import { subscribe } from '../core/events.js'
import type { Annotator, AnnotatorOptions } from '../core/types.js'
import { fitToScreen } from '../image/image-commands.js'
import { getActiveLabel, setActiveLabel } from '../labels/labels.js'
import { usePolygon } from '../tools/polygon-tool.js'
import { useRect } from '../tools/rect-tool.js'
import { useSelect } from '../tools/select-tool.js'
import { annotatorStyles } from './styles.js'

type HTMLElementConstructor = new () => HTMLElement
const HTMLElementBase = (
  globalThis.HTMLElement ?? class {}
) as HTMLElementConstructor

export type ComponentAnnotatorOptions = Omit<AnnotatorOptions, 'container'>

export class CSAnnotatorElement extends HTMLElementBase {
  #annotator: Annotator | null = null
  #unsubscribe: (() => void) | null = null
  #viewport: HTMLElement | null = null
  #labelList: HTMLElement | null = null
  #buttons = new Map<string, HTMLButtonElement>()
  #activeTool: string | null = null

  connectedCallback(): void {
    if (this.shadowRoot !== null) {
      return
    }
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>${annotatorStyles}</style>
      <div part="shell">
        <div part="toolbar" role="toolbar" aria-label="Annotation tools">
          <button type="button" data-action="select" aria-pressed="false">Select</button>
          <button type="button" data-action="rect" aria-pressed="false">Rectangle</button>
          <button type="button" data-action="polygon" aria-pressed="false">Polygon</button>
          <button type="button" data-action="fit">Fit</button>
          <button type="button" data-action="undo">Undo</button>
          <button type="button" data-action="redo">Redo</button>
        </div>
        <div part="workspace">
          <div part="viewport" role="region" aria-label="Annotation viewport"></div>
          <div part="labels" role="group" aria-label="Labels"></div>
        </div>
      </div>
    `
    this.#viewport = root.querySelector('[part="viewport"]')
    this.#labelList = root.querySelector('[part="labels"]')
    for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-action]')) {
      const action = button.dataset.action
      if (action !== undefined) {
        this.#buttons.set(action, button)
        button.addEventListener('click', () => this.#runAction(action))
      }
    }
    this.#refreshControls()
  }

  disconnectedCallback(): void {
    this.destroy()
  }

  configure(options: ComponentAnnotatorOptions = {}): Annotator {
    this.connectedCallback()
    if (this.#viewport === null) {
      throw new Error('Annotation viewport is unavailable.')
    }
    this.destroy()
    const annotator = createAnnotator({
      container: this.#viewport,
      ...(options.historyLimit === undefined
        ? {}
        : { historyLimit: options.historyLimit }),
    })
    this.#annotator = annotator
    this.#unsubscribe = subscribe(annotator, 'change', () => {
      this.#refreshControls()
      this.#refreshLabels()
    })
    this.#refreshControls()
    this.#refreshLabels()
    return annotator
  }

  get annotator(): Annotator | null {
    return this.#annotator
  }

  destroy(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = null
    if (this.#annotator !== null) {
      destroyAnnotator(this.#annotator)
      this.#annotator = null
    }
    this.#activeTool = null
    this.#refreshControls()
  }

  #runAction(action: string): void {
    const annotator = this.#annotator
    if (annotator === null) {
      return
    }
    try {
      if (action === 'select') {
        useSelect(annotator)
        this.#setActiveTool('select')
      } else if (action === 'rect') {
        useRect(annotator)
        this.#setActiveTool('rect')
      } else if (action === 'polygon') {
        usePolygon(annotator)
        this.#setActiveTool('polygon')
      } else if (action === 'fit') {
        fitToScreen(annotator)
      } else if (action === 'undo') {
        undo(annotator)
      } else if (action === 'redo') {
        redo(annotator)
      }
      this.#refreshControls()
    } catch (error) {
      this.dispatchEvent(new CustomEvent('annotatorerror', {
        bubbles: true,
        composed: true,
        detail: error,
      }))
    }
  }

  #setActiveTool(tool: string): void {
    this.#activeTool = tool
    for (const [action, button] of this.#buttons) {
      if (['select', 'rect', 'polygon'].includes(action)) {
        button.setAttribute('aria-pressed', String(action === tool))
      }
    }
  }

  #refreshControls(): void {
    const annotator = this.#annotator
    const enabled = annotator !== null
    for (const [action, button] of this.#buttons) {
      if (action === 'undo') {
        button.disabled = !enabled || !canUndo(annotator as Annotator)
      } else if (action === 'redo') {
        button.disabled = !enabled || !canRedo(annotator as Annotator)
      } else {
        button.disabled = !enabled
      }
    }
    this.#setActiveTool(this.#activeTool ?? '')
  }

  #refreshLabels(): void {
    if (this.#labelList === null || this.#annotator === null) {
      return
    }
    const annotator = this.#annotator
    const activeLabel = getActiveLabel(annotator)
    this.#labelList.replaceChildren()
    for (const label of getSnapshot(annotator).labels) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label.name
      button.style.borderLeft = `4px solid ${label.color}`
      button.setAttribute('aria-pressed', String(label.id === activeLabel))
      button.addEventListener('click', () => {
        setActiveLabel(annotator, label.id)
        this.#refreshLabels()
      })
      this.#labelList.append(button)
    }
  }
}

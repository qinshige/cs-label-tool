import type { Annotator } from '../core/types.js'
import {
  CSAnnotatorElement,
  type ComponentAnnotatorOptions,
} from './annotator-element.js'

export function defineAnnotatorElements(): void {
  if (customElements.get('cs-annotator') === undefined) {
    customElements.define('cs-annotator', CSAnnotatorElement)
  }
}

function resolveTarget(target: string | Element): Element {
  const element = typeof target === 'string'
    ? document.querySelector(target)
    : target
  if (element === null) {
    throw new Error(`Mount target not found: ${target}`)
  }
  return element
}

export function mountAnnotator(
  target: string | Element,
  options: ComponentAnnotatorOptions = {},
): Annotator {
  defineAnnotatorElements()
  const host = resolveTarget(target)
  const element = document.createElement('cs-annotator') as CSAnnotatorElement
  host.append(element)
  return element.configure(options)
}

export function unmountAnnotator(target: string | Element): void {
  const host = resolveTarget(target)
  const element = host.matches('cs-annotator')
    ? host as CSAnnotatorElement
    : host.querySelector<CSAnnotatorElement>('cs-annotator')
  if (element === null) {
    return
  }
  element.destroy()
  element.remove()
}

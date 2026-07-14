import { commitDomainCommand } from '../core/commands.js'
import { getInternalState } from '../core/annotator.js'
import { AnnotatorError } from '../core/types.js'
import type { Annotator, LabelDefinition } from '../core/types.js'

export function addLabel(
  annotator: Annotator,
  label: LabelDefinition,
): void {
  const state = getInternalState(annotator)
  if (state.labels.some(existing => existing.id === label.id)) {
    throw new AnnotatorError(
      'DUPLICATE_LABEL',
      `Label already exists: ${label.id}`,
    )
  }
  const storedLabel = Object.freeze({ ...label })
  const index = state.labels.length
  const previousActiveLabel = state.activeLabelId
  commitDomainCommand(
    annotator,
    'label:add',
    current => {
      current.labels.splice(index, 0, storedLabel)
      if (previousActiveLabel === null) {
        current.activeLabelId = storedLabel.id
      }
    },
    current => {
      current.labels.splice(index, 1)
      current.activeLabelId = previousActiveLabel
    },
  )
}

export function setActiveLabel(annotator: Annotator, labelId: string): void {
  const state = getInternalState(annotator)
  if (!state.labels.some(label => label.id === labelId)) {
    throw new AnnotatorError('UNKNOWN_LABEL', `Unknown label: ${labelId}`)
  }
  const previousActiveLabel = state.activeLabelId
  commitDomainCommand(
    annotator,
    'label:activate',
    current => { current.activeLabelId = labelId },
    current => { current.activeLabelId = previousActiveLabel },
  )
}

export function getActiveLabel(annotator: Annotator): string | null {
  return getInternalState(annotator).activeLabelId
}

export function updateLabel(
  annotator: Annotator,
  labelId: string,
  updates: Partial<Pick<LabelDefinition, 'name' | 'color'>>,
): void {
  const state = getInternalState(annotator)
  const index = state.labels.findIndex(label => label.id === labelId)
  if (index === -1) {
    throw new AnnotatorError('UNKNOWN_LABEL', `Unknown label: ${labelId}`)
  }
  const previous = state.labels[index]
  const next = Object.freeze({ ...previous, ...updates }) as LabelDefinition
  commitDomainCommand(
    annotator,
    'label:update',
    current => { current.labels[index] = next },
    current => { current.labels[index] = previous! },
  )
}

import { executeDomainMutation } from '../core/commands.js'
import { emitChange } from '../core/events.js'
import { getInternalState } from '../core/annotator.js'
import { AnnotatorError } from '../core/types.js'
import type { Annotator, LabelDefinition } from '../core/types.js'

export function addLabel(
  annotator: Annotator,
  label: LabelDefinition,
): void {
  executeDomainMutation(annotator, 'label:add', draft => {
    if (draft.labels.some(existing => existing.id === label.id)) {
      throw new AnnotatorError(
        'DUPLICATE_LABEL',
        `Label already exists: ${label.id}`,
      )
    }
    draft.labels.push(Object.freeze({ ...label }))
    if (draft.activeLabelId === null) {
      draft.activeLabelId = label.id
    }
  })
}

export function setActiveLabel(annotator: Annotator, labelId: string): void {
  const state = getInternalState(annotator)
  if (!state.labels.some(label => label.id === labelId)) {
    throw new AnnotatorError('UNKNOWN_LABEL', `Unknown label: ${labelId}`)
  }
  state.activeLabelId = labelId
  emitChange(annotator, 'label:activate')
}

export function getActiveLabel(annotator: Annotator): string | null {
  return getInternalState(annotator).activeLabelId
}

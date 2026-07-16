import { getInternalState } from '../core/annotator.js'
import { commitDomainCommand } from '../core/commands.js'
import {
  AnnotatorError,
  type Annotator,
  type ClassificationOption,
} from '../core/types.js'

function cloneOptions(
  options: readonly ClassificationOption[],
): ClassificationOption[] {
  return options.map(option => Object.freeze({ ...option }))
}

function validateOptions(options: readonly ClassificationOption[]): void {
  const ids = new Set<string>()
  for (const option of options) {
    if (option.id.trim() === '' || option.name.trim() === '') {
      throw new TypeError('Classification option id and name cannot be empty.')
    }
    if (ids.has(option.id)) {
      throw new TypeError(`Duplicate classification option: ${option.id}`)
    }
    ids.add(option.id)
  }
}

export function setClassificationOptions(
  annotator: Annotator,
  options: readonly ClassificationOption[],
): void {
  validateOptions(options)
  const state = getInternalState(annotator)
  const previousOptions = state.classificationOptions
  const previousId = state.classificationId
  const nextOptions = cloneOptions(options)
  const nextId = previousId !== null && nextOptions.some(item => item.id === previousId)
    ? previousId
    : null
  if (
    JSON.stringify(previousOptions) === JSON.stringify(nextOptions) &&
    previousId === nextId
  ) {
    return
  }
  commitDomainCommand(
    annotator,
    'classification:update',
    current => {
      current.classificationOptions = nextOptions
      current.classificationId = nextId
    },
    current => {
      current.classificationOptions = previousOptions
      current.classificationId = previousId
    },
  )
}

export function getClassificationOptions(
  annotator: Annotator,
): readonly ClassificationOption[] {
  return cloneOptions(getInternalState(annotator).classificationOptions)
}

export function setImageClassification(
  annotator: Annotator,
  classificationId: string,
): void {
  const state = getInternalState(annotator)
  if (!state.classificationOptions.some(item => item.id === classificationId)) {
    throw new AnnotatorError(
      'UNKNOWN_CLASSIFICATION',
      `Unknown classification: ${classificationId}`,
    )
  }
  const previous = state.classificationId
  if (previous === classificationId) {
    return
  }
  commitDomainCommand(
    annotator,
    'classification:update',
    current => { current.classificationId = classificationId },
    current => { current.classificationId = previous },
  )
}

export function clearImageClassification(annotator: Annotator): void {
  const state = getInternalState(annotator)
  const previous = state.classificationId
  if (previous === null) {
    return
  }
  commitDomainCommand(
    annotator,
    'classification:update',
    current => { current.classificationId = null },
    current => { current.classificationId = previous },
  )
}

export function getImageClassification(annotator: Annotator): string | null {
  return getInternalState(annotator).classificationId
}

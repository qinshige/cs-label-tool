import { expect, test } from 'vitest'

import {
  addLabel,
  createAnnotator,
  destroyAnnotator,
  subscribe,
} from '../../src/index.js'

test('continues delivering events when one subscriber throws', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  const received: string[] = []
  const errors: string[] = []
  subscribe(annotator, 'change', () => {
    throw new Error('consumer failure')
  })
  subscribe(annotator, 'change', event => received.push(event.kind))
  subscribe(annotator, 'error', event => errors.push(event.code))

  addLabel(annotator, { id: 'car', name: 'Car', color: '#1677ff' })

  expect(received).toEqual(['label:add'])
  expect(errors).toEqual(['SUBSCRIBER_ERROR'])
})

test('returns an idempotent unsubscribe function and clears on destroy', () => {
  const annotator = createAnnotator({ container: {} as HTMLElement })
  const received: string[] = []
  const unsubscribe = subscribe(
    annotator,
    'change',
    event => received.push(event.kind),
  )

  unsubscribe()
  unsubscribe()
  addLabel(annotator, { id: 'car', name: 'Car', color: '#1677ff' })
  destroyAnnotator(annotator)

  expect(received).toEqual([])
})

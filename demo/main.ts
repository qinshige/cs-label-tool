import {
  addLabel,
  createStandardImageSource,
  mountAnnotator,
  setImageSource,
} from '../src/index.js'

const annotator = mountAnnotator('#app', { historyLimit: 100 })

addLabel(annotator, {
  id: 'person',
  name: '人物',
  color: '#ff4d4f',
})
addLabel(annotator, {
  id: 'vehicle',
  name: '车辆',
  color: '#1677ff',
})

await setImageSource(
  annotator,
  createStandardImageSource('../a.webp'),
)

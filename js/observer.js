// 第一步：定义一个全局的变量存储被注册的副作用函数
let activeEffect
// effent 栈
const effectStack = []

// 第二部：effect 函数用于注册副作用函数
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    // 当 effentFn 执行时, 将其设置为当前激活的副作用函数赋值给 activeEffect
    activeEffect = effectFn
    // 在调用副作用函数之前将当前的副作用函数压入栈中
    effectStack.push(effectFn)
    fn()
    // 在当前副作用函数执行完毕后, 将当前副作用函数弹出栈, 并把 activeEffect 还原为之前的值
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  //  activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []
  // 执行副作用函数
  effectFn()
}

const data = { text: 'Hello World!', span: 'my is span tag' }
const bucket = new WeakMap()
const obj = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
    track(target, key)
    // 返回属性值
    return target[key]
  },
  // 拦截设置操作
  set(target, key, newVal) {
    // 设置属性值
    target[key] = newVal
    // 在set拦截函数内部调用 trigger 函数触发变化
    trigger(target, key)
  },
})
// }

function track(target, key) {
  // 没有 activeEffect，直接return
  if (!activeEffect) return target[key]
  // 根据target从 “桶” 中取得depsMap, 它也是一个Map 类型：key ----> effects
  let depsMap = bucket.get(target)
  // 如果不存在 depsMap，那么新建一个Map并于target关联
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  // 再根据key 从 depsMap 中取得 deps，它是一个 Set类型，
  // 里面存储着所有与当前key相关联的副作用函数： effect;
  let deps = depsMap.get(key)
  // 如果deps不存在，同样新建一个Set并于key关联
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 把当前激活的副作用函数添加到依赖集合deps
  deps.add(activeEffect)
  // deps 就是一个与当前副作用函数存在联系的依赖集合
  // 将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  // 根据tartget从桶中取得 depsMap, 它是 key ---> effect
  const depsMap = bucket.get(target)
  if (!depsMap) return
  // 根据 key 获取所有副作用函数 effects
  const effects = depsMap.get(key)

  const effectToRun = new Set(effects) //
  effectToRun.forEach((effectFn) => effectFn())

  // 执行副作用函数
  // effects && effects.forEach(fn => fn());
}

function cleanup(effectFn) {
  // 遍历 effectFn.deps 数组
  for (let i = 0; i < effectFn.length; i++) {
    // deps 是依赖集合
    const deps = effectFn.deps[i]
    // 将effectFn 从依赖集合中删除
    deps.delete(effectFn)
  }
  // 最后需要重置 effectFn.deps 数组
  effectFn.deps.length = 0
}

// 参数传递一个匿名的副作用函数
effect(function effectFn1() {
  console.log('触发---effectFn1')
  document.querySelector('#span').innerText = obj.span
  effect(function effectFn2() {
    document.querySelector('#p').innerText = obj.text
    console.log('effectFn2')
  })
})

function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

sleep(1000)
  .then(() => {
    obj.text = 'hellow Vue2'
  })
  .then(() => {
    sleep(2000).then(() => {
      obj.span = 'hellow Vue3'
    })
  })

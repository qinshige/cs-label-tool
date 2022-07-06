let activeEffect
// effent 栈
const effectStack = []
function effect(fn, options = {}) {
  let effectFn = () => {
    cleanup(effectFn)
    // 当调用 effent 注册副作用函数时, 将其设置为当前激活的副作用函数赋值给 activeEffect
    activeEffect = effectFn
    // 在调用副作用函数之前将当前的副作用函数压入栈中
    effectStack.push(effectFn)
    const res = fn()
    // 在当前副作用函数执行完毕后, 将当前副作用函数弹出栈, 并把 activeEffect 还原为之前的值
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    // 将 res 作为 effectFn 的返回值
    return res
  }
  // 将 options 挂载到 effectFn上
  effectFn.options = options // 新增
  //  activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []

  // 只有非 lazy 的时候执行
  if (!options.lazy) {
    // 执行副作用函数
    effectFn()
  }
  // 将副作用函数作为返回值返回
  return effectFn
}

const bucket = new WeakMap()
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
  const effectToRun = new Set()
  // 避免无限递归 trigger触发执行的守卫
  console.log('effect', effects, activeEffect)
  effects &&
    effects.forEach((effectFn) => {
      // 如果 trigger 触发执行的副作用函数与当前正在执行的副作用函数相同、则不触发执行
      if (effectFn !== activeEffect) {
        effectToRun.add(effectFn)
      }
    })
  effectToRun.forEach((effectFn) => {
    // 如果一个副作用函数存在调度器、则调用该调度器、并将副作用函数作为参数传递
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      // 否则直接执行副作用函数
      effectFn()
    }
  })
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

function ref(data) {
  return new Proxy(data, {
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
      return true
    },
  })
}

// 计算属性
function computed(getter) {
  // value 用来缓存上一次计算的值
  let value
  // dirty 标志， 用来标识是否需要重新计算值， 为 true 则意味着 “脏”， 需要重新计算
  let dirty = true
  // 把 getter 作为副作用函数， 创建一个 lazy 的 effect
  const effectFn = effect(getter, {
    lazy: true,
    // 添加调度器，在调度器中将 dirty 重置为 true
    scheduler() {
      if (!dirty) {
        dirty = true
        // 当计算属性依赖的响应式数据变化时,手动调用trigger 函数出发响应
        trigger(obj, 'value')
      }
    },
  })

  const obj = {
    // 当读取 value 时才执行 effectFn
    get value() {
      // 只有脏时才需要计算，并将得到的值缓存到 value 中的值
      if (dirty) {
        value = effectFn()
        //将 dirty 设置为 false, 下一次访问直接使用缓存到 value 中的值
        dirty = false
      }
      return value
    },
  }
  return obj
}

function traverse(value, seen = new Set()) {
  // 如果要读区的数据是原始值,或者已经被读取过了, 那么什么都不做
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  // 将数据添加到seen 中, 代表便利地读取过了, 避免循环引起的死循环
  seen.add(value)
  // 暂时不考虑数组等其他结构
  // 假设value 就是一个对象, 使用 for....in 读取对象的每一个值, 并递归地调用
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}
function watch(source, cb, options = {}) {
  let oldVal, newVal
  const job = () => {
    newVal = effectFn()
    // 当数据变化时,调用毁掉函数 cb
    cb(newVal, oldVal)
    oldVal = newVal
  }
  const effectFn = effect(
    // 调用 traverse 递归读取
    typeof source === 'function' ? source : () => traverse(source),
    {
      lazy: true,
      scheduler: job,
    }
  )
  options.immedlate ? job() : (oldVal = effectFn())
}

export { computed, ref, watch }

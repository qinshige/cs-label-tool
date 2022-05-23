export default class Compiler {
    // 第一步：定义一个全局的变量存储被注册的副作用函数
    activeEffect
    // 第二部：effect 函数用于注册副作用函数
    effect(fn) {
        // 当调用 effect 注册副作用函数时。将副作用函数 fn 赋值给 activeEffect
        activeEffect = fn;
        // 执行副作用函数
        fn();
    };
    // data = { text: 'Hello World!' };
    bucket = new WeakMap();
    defineReactive(data) {
        return new Proxy(data, {
            // 拦截读取操作 
            get(target, key) {
                // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
                this.track(target, key);
                // 返回属性值
                return target[key]
            },
            // 拦截设置操作
            set(target, key, newVal) {
                // 设置属性值
                target[key] = newVal;
                // 在set拦截函数内部调用 trigger 函数触发变化
                this.trigger(target, key);
            }
        })
    }

    track(target, key) {
        // 没有 activeEffect，直接return
        if (!activeEffect) return target[key];
        // 根据target从 “桶” 中取得depsMap, 它也是一个Map 类型：key ----> effects
        let depsMap = this.bucket.get(target);
        // 如果不存在 depsMap，那么新建一个Map并于target关联
        if (!depsMap) {
            this.bucket.set(target, (depsMap = new Map()));
        }
        // 再根据key 从 depsMap 中取得 deps，它是一个 Set类型，
        // 里面存储着所有与当前key相关联的副作用函数： effect;
        let deps = depsMap.get(key);
        // 如果deps不存在，同样新建一个Set并于key关联
        if (!deps) {
            depsMap.set(key, (deps = new Set()))
        }
        // 最后将当前激活的副作用函数添加到 “桶” 里
        deps.add(activeEffect)
    }

    trigger(target, key) {
        // 根据tartget从桶中取得 depsMap, 它是 key ---> effect
        const depsMap = this.bucket.get(target);
        if (!depsMap) return;
        // 根据 key 获取所有副作用函数 effects 
        const effects = depsMap.get(key);
        // 执行副作用函数
        effects && effects.forEach(fn => fn());
    }
}
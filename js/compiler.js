export default class Compiler {
    ns = 'http://www.w3.org/2000/svg'
    // 虚拟DOM重建
    Render(vnode, root) {
        // 使用 vnode.tag 作为标签名称创建 DOM 元素
        const el = vnode.type === 'svg' ? document.createElementNS(this.ns, vnode.tag) : document.createElement(vnode.tag);
        // 遍历 vnode.props, 将属性、事件添加到 DOM 元素
        if (vnode.props) {
            for (const key in vnode.props) {
                if (/^on/.test(key)) {
                    // 如果 key 以 on 开头，说明它是事件
                    el.addEventListener(
                        key.substr(2).toLowerCase(), // 事件名称 onClick ---> cllick
                        vnode.props[key]
                    )
                } else {
                    el.setAttribute(key, vnode.props[key])
                }
            }
        }

        // 处理 children
        if (typeof vnode.children === 'string') {
            const text = document.createTextNode(vnode.children);
            el.appendChild(text)
        } else if (vnode.children) {
            // 数组，递归调用Render， 使用el 作为 root 参数
            vnode.children.forEach((child) => this.Render(child, el))
        }
        // 将元素添加到root
        root.appendChild(el)
    };
}
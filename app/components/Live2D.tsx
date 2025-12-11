// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export default function Live2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isLoaded) return

    // 辅助函数：加载脚本并返回 Promise
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // 如果已经加载过，直接返回
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true)
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.crossOrigin = "anonymous"
        script.onload = () => resolve(true)
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
        document.body.appendChild(script)
      })
    }

    const init = async () => {
      try {
        console.log('🔄 开始按顺序加载 Live2D 依赖库...')

        // 1. 先加载 Cubism 2 Core (解决 "Could not find Cubism 2 runtime" 报错)
        await loadScript('https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js')
        
        // 2. 加载 Cubism 4 Core (支持新版模型)
        await loadScript('https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js')

        // 3. 加载 PixiJS (渲染引擎) - 使用 v7 版本
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js')

        // 4. 最后加载 Pixi Live2D Display (连接插件)
        await loadScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js')

        console.log('✅ 所有脚本加载完成，开始初始化模型...')
        setIsLoaded(true)

        // --- 初始化逻辑 ---
        const PIXI = (window as any).PIXI
        
        // 确保插件已挂载
        if (!PIXI.live2d) {
             console.error('❌ Pixi-Live2D 插件未能正确挂载')
             return
        }

        const { Live2DModel } = PIXI.live2d

        // 注册 Ticker (必须)
        Live2DModel.registerTicker(PIXI.Ticker)

        // 创建 Application
        // 注意：如果你发现 canvas 尺寸不对，可以调整这里的 width/height
        const app = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0, // 透明背景
          width: 300,
          height: 400,
        })

        // 加载模型 (这里使用的是 Haru 模型，Cubism 4 格式)
        const model = await Live2DModel.from('https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json')

        // 设置模型位置和缩放
        // 注意：Live2D 模型的坐标系和缩放比例各不相同，需要微调
        model.anchor.set(0.5, 0.5)
        model.position.set(150, 200) // 画布中心
        model.scale.set(0.22)        // 调整大小

        // 绑定点击事件 (播放随机动作或特定动作)
        model.on('hit', (hitAreas: string[]) => {
          if (hitAreas.includes('body')) {
            model.motion('tap_body')
          }
        })

        app.stage.addChild(model)
        console.log('✨ Live2D 模型渲染成功')

      } catch (err) {
        console.error('❌ Live2D 初始化过程出错:', err)
      }
    }

    init()

    // --- 状态同步逻辑 (与右键菜单联动) ---
    const checkDisplay = () => {
        const canvas = document.getElementById('live2d-canvas');
        if (canvas) {
            // 如果本地存储标记为 hidden，则隐藏
            const isHidden = localStorage.getItem('waifu-display') === 'hidden';
            canvas.style.opacity = isHidden ? '0' : '1';
            canvas.style.pointerEvents = isHidden ? 'none' : 'auto';
        }
    }
    
    // 初始化检查 + 监听 storage 事件 (跨标签页同步)
    checkDisplay();
    window.addEventListener('storage', checkDisplay);
    
    // 监听自定义事件 (同页面同步)
    // 我们可以让 ClientHome 在修改 localStorage 后触发一个 window 事件，或者轮询
    // 这里简单起见，加一个定时器检查，或者依赖 React 重新渲染
    const interval = setInterval(checkDisplay, 1000);

    return () => {
        window.removeEventListener('storage', checkDisplay);
        clearInterval(interval);
        // 清理 PIXI 实例 (可选，防止热重载时内存泄漏)
        try {
            // const PIXI = (window as any).PIXI;
            // if (canvasRef.current && PIXI) { ... }
        } catch(e) {}
    }
  }, [isLoaded])

  return (
    <canvas 
        id="live2d-canvas"
        ref={canvasRef}
        style={{
            position: 'fixed',
            right: '0px',
            bottom: '0px',
            zIndex: 50,
            width: '300px',
            height: '400px',
            pointerEvents: 'auto',
            transition: 'opacity 0.3s ease'
        }}
    />
  )
}
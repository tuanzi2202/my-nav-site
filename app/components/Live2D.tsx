// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export default function Live2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isLoaded) return

    // 辅助函数：串行加载脚本，确保依赖顺序
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
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

        // 1. 加载 Cubism 2 Core (旧版核心，防止插件报错)
        await loadScript('https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js')
        
        // 2. 加载 Cubism 4 Core (新版核心)
        await loadScript('https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js')

        // 3. 加载 PixiJS v7
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js')

        // 4. 加载 Pixi Live2D Plugin
        await loadScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js')

        console.log('✅ 脚本加载完成，初始化模型...')
        setIsLoaded(true)

        const PIXI = (window as any).PIXI
        if (!PIXI.live2d) {
             console.error('❌ Pixi-Live2D 插件未挂载')
             return
        }

        const { Live2DModel } = PIXI.live2d
        Live2DModel.registerTicker(PIXI.Ticker)

        // --- 核心调整区域 ---
        const CANVAS_WIDTH = 280  // 宽度稍微收窄，不遮挡内容
        const CANVAS_HEIGHT = 480 // 高度拉长，防止头部被截断

        const app = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        })

        // 加载 Haru 模型
        const model = await Live2DModel.from('https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json')

        // ✨✨✨ 修复配置 ✨✨✨
        // 1. 锚点设为中心
        model.anchor.set(0.5, 0.5)

        // 2. 位置：X居中，Y向下移动 (数值越大越靠下)
        // 之前是 200，现在改为 260，让头部露出来
        model.position.set(CANVAS_WIDTH / 2, 260)

        // 3. 缩放：调小比例
        // 之前是 0.22，现在改为 0.12
        model.scale.set(0.12)

        // 交互动作
        model.on('hit', (hitAreas: string[]) => {
          if (hitAreas.includes('body')) {
            model.motion('tap_body')
          }
        })

        app.stage.addChild(model)
        console.log('✨ Live2D 渲染成功')

      } catch (err) {
        console.error('❌ 初始化失败:', err)
      }
    }

    init()

    // 状态同步
    const checkDisplay = () => {
        const canvas = document.getElementById('live2d-canvas');
        if (canvas) {
            const isHidden = localStorage.getItem('waifu-display') === 'hidden';
            canvas.style.opacity = isHidden ? '0' : '1';
            canvas.style.pointerEvents = isHidden ? 'none' : 'auto';
        }
    }
    checkDisplay();
    window.addEventListener('storage', checkDisplay);
    const interval = setInterval(checkDisplay, 1000);

    return () => {
        window.removeEventListener('storage', checkDisplay);
        clearInterval(interval);
    }
  }, [isLoaded])

  return (
    <canvas 
        id="live2d-canvas"
        ref={canvasRef}
        style={{
            position: 'fixed',
            right: '0px',     // 靠右
            bottom: '0px',    // 靠底
            zIndex: 50,
            width: '280px',   // CSS显示宽度
            height: '480px',  // CSS显示高度
            pointerEvents: 'auto',
            transition: 'opacity 0.3s ease'
        }}
    />
  )
}
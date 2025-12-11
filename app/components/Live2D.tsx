// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

// 默认配置
const DEFAULT_MODEL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'
const CANVAS_WIDTH = 280
const CANVAS_HEIGHT = 480

export default function Live2D({ settings }: { settings: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false)
  const appRef = useRef<any>(null)   // 保存 PIXI Application 实例
  const modelRef = useRef<any>(null) // 保存当前模型实例

  // 1. 提取配置 (给予默认值)
  const modelUrl = settings?.live2dModel || DEFAULT_MODEL
  const scale = settings?.live2dScale ?? 0.12
  const offsetX = settings?.live2dX ?? 0
  const offsetY = settings?.live2dY ?? 0

  // 2. 加载依赖脚本 (只执行一次)
  useEffect(() => {
    if (isScriptsLoaded) return

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
        script.onerror = () => reject(new Error(`Failed to load: ${src}`))
        document.body.appendChild(script)
      })
    }

    const initScripts = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js')
        await loadScript('https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js')
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js')
        
        // 注册 Ticker
        const PIXI = (window as any).PIXI
        if (PIXI && PIXI.live2d) {
            PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker)
            setIsScriptsLoaded(true)
        }
      } catch (err) {
        console.error('Live2D Scripts load failed:', err)
      }
    }
    initScripts()
  }, [])

  // 3. 初始化 PIXI App 并加载模型 (当脚本加载完成 或 模型URL改变时)
  useEffect(() => {
    if (!isScriptsLoaded || !canvasRef.current) return

    const PIXI = (window as any).PIXI
    const { Live2DModel } = PIXI.live2d

    // 如果 app 不存在，初始化 app
    if (!appRef.current) {
        appRef.current = new PIXI.Application({
            view: canvasRef.current,
            autoStart: true,
            backgroundAlpha: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
        })
    }

    const app = appRef.current

    // 加载模型函数
    const loadModel = async () => {
        try {
            // 如果已有模型，先移除
            if (modelRef.current) {
                app.stage.removeChild(modelRef.current)
                modelRef.current.destroy()
                modelRef.current = null
            }

            console.log('Loading Live2D Model:', modelUrl)
            const model = await Live2DModel.from(modelUrl)
            
            // 基础配置
            model.anchor.set(0.5, 0.5)
            
            // 交互
            model.on('hit', (hitAreas: string[]) => {
                if (hitAreas.includes('body')) model.motion('tap_body')
            })

            app.stage.addChild(model)
            modelRef.current = model
            
            // 立即应用一次位置 (避免闪烁)
            updateTransform()
        } catch (e) {
            console.error('Failed to load Live2D model:', e)
        }
    }

    loadModel()

    // 卸载组件时清理
    return () => {
        // 通常不需要销毁 app，因为它是全局唯一的且昂贵，
        // 但如果模型 URL 变了，我们需要清理旧模型 (上面 loadModel 里做了)
    }
  }, [isScriptsLoaded, modelUrl]) // 依赖 modelUrl，变化时重载模型

  // 4. 实时更新位置和缩放 (不重新加载模型，高性能)
  const updateTransform = () => {
      if (modelRef.current) {
          modelRef.current.scale.set(scale)
          // 基础位置 (中心点 + 底部偏移) + 用户自定义偏移
          // 之前代码：CANVAS_WIDTH / 2, 260
          // 现在的逻辑：基准点 + offset
          modelRef.current.position.set(
              (CANVAS_WIDTH / 2) + offsetX, 
              260 + offsetY
          )
      }
  }

  // 监听位置/缩放变化
  useEffect(() => {
      updateTransform()
  }, [scale, offsetX, offsetY, isScriptsLoaded]) // 当这些参数变动时执行

  // 5. 显示/隐藏逻辑
  useEffect(() => {
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
  }, [])

  return (
    <canvas 
        id="live2d-canvas"
        ref={canvasRef}
        style={{
            position: 'fixed',
            right: '0px',
            bottom: '0px',
            zIndex: 50,
            width: `${CANVAS_WIDTH}px`, 
            height: `${CANVAS_HEIGHT}px`,
            pointerEvents: 'auto',
            transition: 'opacity 0.3s ease'
        }}
    />
  )
}
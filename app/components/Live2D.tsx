// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

// 默认模型
const DEFAULT_MODEL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'

// 👇 核心修复：这里将传入的 settings 重命名为 initialSettings
export default function Live2D({ settings: initialSettings }: { settings: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  
  // 1. 预览配置状态
  const [previewSettings, setPreviewSettings] = useState<any>(null)
  
  // 👇 现在的 settings 变量就不会冲突了
  const settings = previewSettings || initialSettings

  // 2. 监听预览事件
  useEffect(() => {
    const handlePreviewUpdate = (event: CustomEvent) => {
        setPreviewSettings(event.detail)
    }
    // 监听自定义事件
    window.addEventListener('live2d-preview-change' as any, handlePreviewUpdate)
    return () => {
        window.removeEventListener('live2d-preview-change' as any, handlePreviewUpdate)
    }
  }, [])

  // 提取配置
  const modelUrl = settings?.live2dModel || DEFAULT_MODEL
  const scale = settings?.live2dScale ?? 0.12
  const offsetX = settings?.live2dX ?? 0
  const offsetY = settings?.live2dY ?? 0
  const canvasWidth = settings?.live2dWidth ?? 280
  const canvasHeight = settings?.live2dHeight ?? 480
  const showBorder = settings?.live2dBorder || false

  // 加载依赖脚本
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

  // 初始化 PIXI App
  useEffect(() => {
    if (!isScriptsLoaded || !canvasRef.current) return

    const PIXI = (window as any).PIXI
    const { Live2DModel } = PIXI.live2d

    if (!appRef.current) {
        appRef.current = new PIXI.Application({
            view: canvasRef.current,
            autoStart: true,
            backgroundAlpha: 0,
            width: canvasWidth,
            height: canvasHeight,
        })
    }

    const app = appRef.current

    // 监听尺寸变化
    if (app.renderer) {
        app.renderer.resize(canvasWidth, canvasHeight)
    }

    const loadModel = async () => {
        try {
            if (modelRef.current) {
                app.stage.removeChild(modelRef.current)
                modelRef.current.destroy()
                modelRef.current = null
            }
            // console.log('Loading Live2D Model:', modelUrl)
            const model = await Live2DModel.from(modelUrl)
            model.anchor.set(0.5, 0.5)
            
            model.on('hit', (hitAreas: string[]) => {
                if (hitAreas.includes('body')) model.motion('tap_body')
            })

            app.stage.addChild(model)
            modelRef.current = model
            updateTransform() // 初始位置
        } catch (e) {
            console.error('Failed to load Live2D model:', e)
        }
    }

    loadModel()

  }, [isScriptsLoaded, modelUrl, canvasWidth, canvasHeight]) 

  // 实时更新位置和缩放
  const updateTransform = () => {
      if (modelRef.current) {
          modelRef.current.scale.set(scale)
          const baseX = canvasWidth / 2
          const baseY = canvasHeight * 0.6 
          modelRef.current.position.set(
              baseX + offsetX, 
              baseY + offsetY
          )
      }
  }

  // 监听参数变化，触发位置更新
  useEffect(() => {
      updateTransform()
  }, [scale, offsetX, offsetY, isScriptsLoaded, canvasWidth, canvasHeight]) 

  // 显示/隐藏逻辑
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
            width: `${canvasWidth}px`, 
            height: `${canvasHeight}px`,
            pointerEvents: 'auto',
            transition: 'opacity 0.3s ease',
            border: showBorder ? '2px dashed #ff0055' : 'none',
            backgroundColor: showBorder ? 'rgba(255, 0, 85, 0.05)' : 'transparent',
        }}
    />
  )
}
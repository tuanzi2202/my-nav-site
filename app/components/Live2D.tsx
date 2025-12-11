// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

export default function Live2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScriptsLoaded, setIsScriptsLoaded] = useState({
    cubism: false,
    pixi: false,
    pixiLive2d: false
  })

  // 检查所有脚本是否加载完成
  const ready = isScriptsLoaded.cubism && isScriptsLoaded.pixi && isScriptsLoaded.pixiLive2d

  useEffect(() => {
    if (!ready || !canvasRef.current) return

    // 获取全局变量
    const PIXI = (window as any).PIXI
    const { Live2DModel } = (window as any).PIXI.live2d

    // 注册 Ticker (PixiJS 7.x 需要)
    (window as any).PIXI.live2d.Live2DModel.registerTicker((window as any).PIXI.Ticker)

    const init = async () => {
      // 1. 创建 Pixi 应用
      const app = new PIXI.Application({
        view: canvasRef.current,
        autoStart: true,
        backgroundAlpha: 0, // 透明背景
        width: 300,         // 画布宽度
        height: 400,        // 画布高度
        resizeTo: window    // 跟随窗口调整 (可选，这里我们用固定小画布更合适)
      })

      // 2. 加载模型
      // 这里使用一个开源的 Live2D 模型 URL (Haru)
      // 你可以将此 URL 替换为你自己的模型 JSON 文件地址
      const modelUrl = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'
      
      try {
        const model = await Live2DModel.from(modelUrl)

        // 3. 设置模型属性
        model.x = 0
        model.y = 0
        model.scale.set(0.2) // 根据模型实际大小调整缩放
        model.anchor.set(0.5, 0.5) // 设置锚点为中心

        // 将模型放置在画布右下角附近
        // 注意：这里的坐标是相对于 Canvas 内部的
        // 因为我们将 Canvas 固定在屏幕右下角，所以这里居中显示即可
        model.x = app.screen.width * 0.8
        model.y = app.screen.height * 0.8

        // 4. 添加交互 (可选)
        model.on('hit', (hitAreas: any) => {
          if (hitAreas.includes('body')) {
            model.motion('tap_body')
          }
        })

        app.stage.addChild(model)
        console.log('✨ Live2D 模型加载完成')

      } catch (e) {
        console.error('❌ Live2D 模型加载失败:', e)
      }
    }

    init()

    // 检查隐藏状态
    const checkDisplay = () => {
        const canvas = document.getElementById('live2d-canvas');
        if (canvas) {
            const isHidden = localStorage.getItem('waifu-display') === 'hidden';
            canvas.style.opacity = isHidden ? '0' : '1';
            canvas.style.pointerEvents = isHidden ? 'none' : 'auto';
        }
    }
    checkDisplay();
    window.addEventListener('storage', checkDisplay); // 跨标签页同步

    return () => {
        window.removeEventListener('storage', checkDisplay);
        // 清理 Pixi 应用 (如果需要)
    }
  }, [ready])

  return (
    <>
      {/* 1. 加载 Cubism Core (必须) */}
      <Script 
        src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js" 
        onLoad={() => setIsScriptsLoaded(prev => ({ ...prev, cubism: true }))}
      />
      
      {/* 2. 加载 PixiJS (渲染引擎) */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js" 
        onLoad={() => setIsScriptsLoaded(prev => ({ ...prev, pixi: true }))}
      />

      {/* 3. 加载 Pixi-Live2D-Display (连接插件) */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js" 
        onLoad={() => setIsScriptsLoaded(prev => ({ ...prev, pixiLive2d: true }))}
      />

      <canvas 
        id="live2d-canvas"
        ref={canvasRef}
        style={{
            position: 'fixed',
            right: 0,
            bottom: 0,
            zIndex: 50,
            width: '300px',  // 控制显示大小
            height: '400px',
            pointerEvents: 'auto', // 允许点击交互
            transition: 'opacity 0.3s ease'
        }}
      />
    </>
  )
}
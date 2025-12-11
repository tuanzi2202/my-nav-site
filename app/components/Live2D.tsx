// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { chatWithAI } from '../actions' // 👈 引入刚才写的后端函数

const DEFAULT_MODEL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'

export default function Live2D({ settings: initialSettings }: { settings: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  
  // 1. 预览配置状态
  const [previewSettings, setPreviewSettings] = useState<any>(null)
  const settings = previewSettings || initialSettings

  // ✨✨✨ 新增：聊天相关状态 ✨✨✨
  const [chatInput, setChatInput] = useState('')
  const [chatMessage, setChatMessage] = useState('欢迎回来，主人！') // 默认气泡内容
  const [showChat, setShowChat] = useState(true) // 是否显示气泡
  const [isThinking, setIsThinking] = useState(false) // 是否正在请求 AI
  const [showInput, setShowInput] = useState(false) // 是否显示输入框

  // 监听预览事件
  useEffect(() => {
    const handlePreviewUpdate = (event: CustomEvent) => {
        setPreviewSettings(event.detail)
    }
    window.addEventListener('live2d-preview-change' as any, handlePreviewUpdate)
    return () => {
        window.removeEventListener('live2d-preview-change' as any, handlePreviewUpdate)
    }
  }, [])

  const modelUrl = settings?.live2dModel || DEFAULT_MODEL
  const scale = settings?.live2dScale ?? 0.12
  const offsetX = settings?.live2dX ?? 0
  const offsetY = settings?.live2dY ?? 0
  const canvasWidth = settings?.live2dWidth ?? 280
  const canvasHeight = settings?.live2dHeight ?? 480
  const showBorder = settings?.live2dBorder || false

  // ... (加载脚本的 useEffect 保持不变) ...
  useEffect(() => {
    if (isScriptsLoaded) return
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(true); return }
        const script = document.createElement('script')
        script.src = src; script.crossOrigin = "anonymous"
        script.onload = () => resolve(true); script.onerror = () => reject(new Error(`Failed to load: ${src}`))
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
      } catch (err) { console.error('Live2D Scripts load failed:', err) }
    }
    initScripts()
  }, [])

  // ... (初始化 PIXI 的 useEffect 保持不变) ...
  useEffect(() => {
    if (!isScriptsLoaded || !canvasRef.current) return
    const PIXI = (window as any).PIXI
    const { Live2DModel } = PIXI.live2d
    if (!appRef.current) {
        appRef.current = new PIXI.Application({
            view: canvasRef.current, autoStart: true, backgroundAlpha: 0, width: canvasWidth, height: canvasHeight,
        })
    }
    const app = appRef.current
    const loadModel = async () => {
        try {
            if (modelRef.current) { app.stage.removeChild(modelRef.current); modelRef.current.destroy(); modelRef.current = null }
            const model = await Live2DModel.from(modelUrl)
            model.anchor.set(0.5, 0.5)
            // 点击模型身体时，显示输入框
            model.on('hit', (hitAreas: string[]) => {
                if (hitAreas.includes('body')) {
                    model.motion('tap_body')
                    setShowInput(prev => !prev) // 切换输入框显示
                    setChatMessage(prev => prev === '...' ? '找我有什么事吗？' : prev)
                    setShowChat(true)
                }
            })
            app.stage.addChild(model)
            modelRef.current = model
            updateTransform()
        } catch (e) { console.error('Failed to load Live2D model:', e) }
    }
    loadModel()
  }, [isScriptsLoaded, modelUrl]) 

  // ... (尺寸调整 useEffect 保持不变) ...
  useEffect(() => {
      if (appRef.current && appRef.current.renderer) { appRef.current.renderer.resize(canvasWidth, canvasHeight) }
  }, [canvasWidth, canvasHeight])

  // ... (位置更新 useEffect 保持不变) ...
  const updateTransform = () => {
      if (modelRef.current) {
          modelRef.current.scale.set(scale)
          const baseX = canvasWidth / 2
          const baseY = canvasHeight * 0.6 
          modelRef.current.position.set(baseX + offsetX, baseY + offsetY)
      }
  }
  useEffect(() => { updateTransform() }, [scale, offsetX, offsetY, isScriptsLoaded, canvasWidth, canvasHeight]) 

  // ... (隐藏显示逻辑 useEffect 保持不变) ...
  useEffect(() => {
    const checkDisplay = () => {
        const container = document.getElementById('live2d-container');
        if (container) {
            const isHidden = localStorage.getItem('waifu-display') === 'hidden';
            container.style.opacity = isHidden ? '0' : '1';
            container.style.pointerEvents = isHidden ? 'none' : 'auto';
        }
    }
    checkDisplay();
    window.addEventListener('storage', checkDisplay);
    const interval = setInterval(checkDisplay, 1000);
    return () => { window.removeEventListener('storage', checkDisplay); clearInterval(interval); }
  }, [])

  // ✨✨✨ 新增：处理发送消息 ✨✨✨
  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!chatInput.trim() || isThinking) return

      const question = chatInput
      setChatInput('') // 清空输入
      setChatMessage('让我想想...') 
      setIsThinking(true)

      // 调用后端 API
      const res = await chatWithAI(question)
      
      setIsThinking(false)
      if (res.success) {
          setChatMessage(res.reply)
          // 如果模型加载了，可以触发一个动作
          if (modelRef.current) {
             // 尝试播放随机动作增加生动感
             modelRef.current.motion('tap_body') 
          }
      } else {
          setChatMessage('呜呜，刚才没听清...')
      }
      
      // 5秒后自动隐藏气泡，除非鼠标移上去（这里简化处理，暂不自动隐藏输入框）
  }

  // 👇 修改渲染结构，使用 Container 包裹 Canvas 和 UI
  return (
    <div 
        id="live2d-container"
        style={{
            position: 'fixed',
            right: '0px',
            bottom: '0px',
            zIndex: 50,
            width: `${canvasWidth}px`, 
            height: `${canvasHeight}px`,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none', // 容器本身透传点击
        }}
    >
        {/* ✨ 对话气泡 ✨ */}
        <div 
            className={`absolute top-10 left-1/2 -translate-x-1/2 w-[90%] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 transition-all duration-300 pointer-events-auto ${showChat ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ zIndex: 52 }}
        >
            <p className="text-xs text-slate-700 leading-relaxed font-medium">{chatMessage}</p>
            {/* 小三角 */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 rotate-45 border-r border-b border-slate-200"></div>
        </div>

        {/* ✨ 输入框区域 (点击模型后显示) ✨ */}
        {showInput && (
            <form 
                onSubmit={handleSend}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] flex gap-2 pointer-events-auto animate-in slide-in-from-bottom-2"
                style={{ zIndex: 52 }}
            >
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="和 Haru 聊天..."
                    className="flex-1 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/50 shadow-sm"
                />
                <button 
                    type="submit"
                    disabled={isThinking}
                    className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-1.5 w-8 h-8 flex items-center justify-center shadow-md transition-colors disabled:bg-slate-400"
                >
                    {isThinking ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg className="w-3 h-3 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    )}
                </button>
            </form>
        )}

        {/* Canvas 画布 */}
        <canvas 
            id="live2d-canvas"
            ref={canvasRef}
            style={{
                width: '100%', 
                height: '100%',
                pointerEvents: 'auto', // 画布需要响应点击
                border: showBorder ? '2px dashed #ff0055' : 'none',
                backgroundColor: showBorder ? 'rgba(255, 0, 85, 0.05)' : 'transparent',
            }}
        />
    </div>
  )
}
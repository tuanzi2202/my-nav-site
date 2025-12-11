// app/components/Live2D.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { chatWithAI } from '../actions'

const DEFAULT_MODEL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'

// 本地配置的类型定义
type Live2DConfig = {
  duration: number
  apiSource: 'server' | 'custom'
  customApiUrl: string
  customApiKey: string
  customModel: string
}

export default function Live2D({ settings: initialSettings }: { settings: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  
  const [previewSettings, setPreviewSettings] = useState<any>(null)
  const settings = previewSettings || initialSettings

  // --- 聊天相关状态 ---
  const [chatInput, setChatInput] = useState('')
  const [chatMessage, setChatMessage] = useState('欢迎回来，主人！(右键点击我可以设置哦)') 
  const [showChat, setShowChat] = useState(true) 
  const [isThinking, setIsThinking] = useState(false) 
  const [showInput, setShowInput] = useState(false) 

  // --- 本地配置状态 ---
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [config, setConfig] = useState<Live2DConfig>({
    duration: 5, // 默认 5 秒自动消失
    apiSource: 'server',
    customApiUrl: 'https://api.openai.com/v1/chat/completions',
    customApiKey: '',
    customModel: 'gpt-3.5-turbo'
  })

  // 1. 初始化加载本地配置
  useEffect(() => {
    const saved = localStorage.getItem('live2d_user_config')
    if (saved) {
      try {
        setConfig({ ...config, ...JSON.parse(saved) })
      } catch (e) { console.error('Read config failed', e) }
    }
  }, [])

  // 2. 监听配置变化，自动保存
  const updateConfig = (key: keyof Live2DConfig, value: any) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('live2d_user_config', JSON.stringify(next))
      return next
    })
  }

  // 3. ✨✨✨ 自动隐藏对话框逻辑 ✨✨✨
  useEffect(() => {
    if (showChat && chatMessage) {
      // 如果正在思考中，暂不隐藏，直到回复出现后再开始计时
      if (isThinking) return

      const timer = setTimeout(() => {
        setShowChat(false)
      }, config.duration * 1000)
      
      return () => clearTimeout(timer)
    }
  }, [chatMessage, showChat, config.duration, isThinking])

  // 监听 Layout 传来的全局配置预览
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

  // 加载 Live2D 脚本
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

  // 初始化 PIXI 应用
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
            
            model.on('hit', (hitAreas: string[]) => {
                // 点击模型任意位置触发交互
                if (hitAreas.length > 0 || true) { // 宽松判断
                    model.motion('tap_body')
                    setShowInput(prev => !prev)
                    setChatMessage('找我有什么事吗？')
                    setShowChat(true) // 重新显示对话框
                }
            })

            app.stage.addChild(model)
            modelRef.current = model
            updateTransform()
        } catch (e) { console.error('Failed to load Live2D model:', e) }
    }
    loadModel()
  }, [isScriptsLoaded, modelUrl]) 

  useEffect(() => {
      if (appRef.current && appRef.current.renderer) { appRef.current.renderer.resize(canvasWidth, canvasHeight) }
  }, [canvasWidth, canvasHeight])

  const updateTransform = () => {
      if (modelRef.current) {
          modelRef.current.scale.set(scale)
          const baseX = canvasWidth / 2
          const baseY = canvasHeight * 0.6 
          modelRef.current.position.set(baseX + offsetX, baseY + offsetY)
      }
  }
  useEffect(() => { updateTransform() }, [scale, offsetX, offsetY, isScriptsLoaded, canvasWidth, canvasHeight]) 

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

  // ✨✨✨ 聊天发送逻辑（支持 API 切换） ✨✨✨
  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!chatInput.trim() || isThinking) return

      const question = chatInput
      setChatInput('') 
      setChatMessage('让我想想...') 
      setShowChat(true) // 确保对话框显示
      setIsThinking(true)

      try {
          let reply = ''
          
          if (config.apiSource === 'custom') {
              // --- 走自定义 API (前端直接请求) ---
              if (!config.customApiKey) {
                  throw new Error('请先在右键菜单中配置 API Key')
              }
              const res = await fetch(config.customApiUrl, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${config.customApiKey}`
                  },
                  body: JSON.stringify({
                      model: config.customModel || 'gpt-3.5-turbo',
                      messages: [
                          { role: 'system', content: '你是一个可爱的看板娘，说话简短有趣，带点傲娇。' },
                          { role: 'user', content: question }
                      ],
                      max_tokens: 100
                  })
              })
              const data = await res.json()
              if (data.error) throw new Error(data.error.message)
              reply = data.choices?.[0]?.message?.content || 'API 返回了空内容'

          } else {
              // --- 走默认服务器 API ---
              const res = await chatWithAI(question)
              if (!res.success) throw new Error(res.reply)
              reply = res.reply
          }

          setChatMessage(reply)
          if (modelRef.current) modelRef.current.motion('tap_body') 

      } catch (err: any) {
          console.error(err)
          setChatMessage(`出错啦：${err.message || '网络请求失败'}`)
      } finally {
          setIsThinking(false)
          // 回复完成后，计时器会在 useEffect 中重新启动，自动隐藏气泡
      }
  }

  // ✨✨✨ 处理右键菜单 ✨✨✨
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault() // 阻止默认浏览器右键
      e.stopPropagation()
      setShowConfigPanel(true)
  }

  return (
    <>
        <div 
            id="live2d-container"
            onContextMenu={handleContextMenu} // 绑定右键事件
            style={{
                position: 'fixed',
                right: '0px',
                bottom: '0px',
                zIndex: 50,
                width: `${canvasWidth}px`, 
                height: `${canvasHeight}px`,
                transition: 'opacity 0.3s ease',
                // 如果 config 面板打开，这里设为 none 防止遮挡，否则 auto
                pointerEvents: showConfigPanel ? 'none' : 'auto', 
            }}
        >
            {/* 对话气泡 */}
            <div 
                className={`absolute bottom-[90%] left-1/2 -translate-x-1/2 w-[90%] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 transition-all duration-300 pointer-events-auto ${showChat ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}
                style={{ zIndex: 52, marginBottom: '20px' }}
            >
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{chatMessage}</p>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 rotate-45 border-r border-b border-slate-200"></div>
            </div>

            {/* 输入框 */}
            {showInput && !showConfigPanel && (
                <form 
                    onSubmit={handleSend}
                    className="absolute bottom-2 left-2 right-2 flex gap-2 pointer-events-auto animate-in slide-in-from-bottom-2"
                    style={{ zIndex: 60 }}
                >
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onMouseDown={e => e.stopPropagation()} // 防止点输入框穿透
                        placeholder="说点什么..."
                        autoFocus
                        className="flex-1 min-w-0 bg-white/90 backdrop-blur-sm border border-pink-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 shadow-lg text-slate-700"
                    />
                    <button 
                        type="submit"
                        disabled={isThinking}
                        className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg transition-colors disabled:bg-slate-400 shrink-0"
                    >
                        {isThinking ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-4 h-4 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        )}
                    </button>
                </form>
            )}

            {/* Canvas */}
            <canvas 
                id="live2d-canvas"
                ref={canvasRef}
                style={{
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'auto', 
                    border: showBorder ? '2px dashed #ff0055' : 'none',
                    backgroundColor: showBorder ? 'rgba(255, 0, 85, 0.05)' : 'transparent',
                }}
            />
        </div>

        {/* ✨✨✨ 看板娘设置面板 (新增) ✨✨✨ */}
        {showConfigPanel && (
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
                onClick={() => setShowConfigPanel(false)}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div 
                    className="bg-slate-900 border border-slate-700 w-80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-700">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>⚙️ 看板娘设置</span>
                        </h3>
                        <button onClick={() => setShowConfigPanel(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    
                    <div className="p-5 space-y-5">
                        {/* 1. 对话框显示时间 */}
                        <div>
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>对话框停留时间</span>
                                <span className="text-pink-400 font-mono">{config.duration} 秒</span>
                            </div>
                            <input 
                                type="range" 
                                min="2" max="20" step="1"
                                value={config.duration}
                                onChange={(e) => updateConfig('duration', Number(e.target.value))}
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                        </div>

                        {/* 2. API 源选择 */}
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">AI 对话服务</label>
                            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                                <button 
                                    onClick={() => updateConfig('apiSource', 'server')}
                                    className={`flex-1 py-1.5 text-xs rounded-md transition ${config.apiSource === 'server' ? 'bg-slate-800 text-pink-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    网站默认
                                </button>
                                <button 
                                    onClick={() => updateConfig('apiSource', 'custom')}
                                    className={`flex-1 py-1.5 text-xs rounded-md transition ${config.apiSource === 'custom' ? 'bg-slate-800 text-pink-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    自定义 API
                                </button>
                            </div>
                        </div>

                        {/* 3. 自定义 API 详情 */}
                        {config.apiSource === 'custom' && (
                            <div className="space-y-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">API Address (URL)</label>
                                    <input 
                                        value={config.customApiUrl}
                                        onChange={(e) => updateConfig('customApiUrl', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-pink-500 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">API Key (Bearer)</label>
                                    <input 
                                        type="password"
                                        value={config.customApiKey}
                                        onChange={(e) => updateConfig('customApiKey', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-pink-500 outline-none"
                                        placeholder="sk-..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">Model Name</label>
                                    <input 
                                        value={config.customModel}
                                        onChange={(e) => updateConfig('customModel', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-pink-500 outline-none"
                                        placeholder="gpt-3.5-turbo"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <p className="text-[10px] text-slate-600 text-center">
                            设置仅保存在本地浏览器中
                        </p>
                    </div>
                </div>
            </div>
        )}
    </>
  )
}
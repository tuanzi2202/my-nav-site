// app/components/ClientHome.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 类型定义
type LinkItem = {
  id: number
  title: string
  url: string
  description: string | null
  category: string
  isRecommended: boolean
  createdAt: Date
}

type CategoryData = {
  category: string
  _count: { category: number }
}

type ClientHomeProps = {
  links: LinkItem[]
  categoriesData: CategoryData[]
  currentCategory: string
  searchQuery: string
}

function formatUrl(url: string) { if (!url) return '#'; const cleanUrl = url.trim(); if (!cleanUrl.startsWith('http')) return `https://${cleanUrl}`; return cleanUrl; }
function getFaviconUrl(rawUrl: string) { try { const hostname = new URL(formatUrl(rawUrl)).hostname; return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`; } catch { return "https://www.google.com/s2/favicons?domain=google.com&sz=128"; } }

export default function ClientHome({ links, categoriesData, currentCategory, searchQuery }: ClientHomeProps) {
  const router = useRouter()
  
  // --- ✨ 设置状态管理 ---
  // 修改：移除 aurora，其他默认设为 false
  const [settings, setSettings] = useState({
    noise: false,    // 默认关闭
    glow: false,     // 默认关闭
    tilt: false      // 默认关闭
  })
  const [showSettings, setShowSettings] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // 初始化：从本地存储读取设置
  useEffect(() => {
    const saved = localStorage.getItem('nav_settings')
    if (saved) {
      // 兼容旧数据：如果旧数据里有 aurora，通过解构赋值自动过滤掉
      const { aurora, ...rest } = JSON.parse(saved)
      // 如果本地没有存储（第一次访问），保持默认 false；如果有存储，使用存储的值
      setSettings(prev => ({ ...prev, ...rest }))
    }
  }, [])

  // 保存设置
  const toggleSetting = (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    localStorage.setItem('nav_settings', JSON.stringify(newSettings))
  }

  // 鼠标移动监听 (用于光晕效果)
  useEffect(() => {
    if (!settings.glow) return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [settings.glow])

  // 处理搜索跳转
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('query') as string
    const categoryParam = currentCategory !== 'Recommended' && currentCategory !== 'All' ? `&category=${currentCategory}` : ''
    router.push(`/?query=${query}${categoryParam}`)
  }

  // --- 3D 卡片视差效果逻辑 ---
  const handleCardMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!settings.tilt) return
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = ((y - centerY) / centerY) * -5
    const rotateY = ((x - centerX) / centerX) * 5

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
  }

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = ''
  }

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 overflow-hidden">
      {/* 注入滚动条 CSS (移除了 aurora 动画) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.4); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.8); }
      `}</style>

      {/* --- ✨ 特效层 (移除了 aurora) --- */}
      
      {/* 1. 噪点纹理 */}
      {settings.noise && (
        <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      )}

      {/* 2. 鼠标光晕 (随鼠标移动) */}
      {settings.glow && (
        <div 
          className="fixed z-0 pointer-events-none w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[80px] transition-transform duration-75 will-change-transform"
          style={{ 
            left: mousePos.x - 300, 
            top: mousePos.y - 300,
          }}
        />
      )}

      {/* --- 主界面 --- */}
      <div className="relative z-10 flex h-screen">
        
        {/* 左侧侧边栏 */}
        <aside className="w-64 border-r border-slate-800/40 bg-slate-900/60 backdrop-blur-xl flex-col hidden md:flex h-full">
          <div className="p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">MyNav</h1>
            <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Developer Hub</p>
          </div>
          
          <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
            <button onClick={() => router.push('/?category=All')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'All' ? 'bg-slate-800/80 text-white ring-1 ring-slate-700 shadow-lg' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
              <span>全部工具</span><span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md">All</span>
            </button>
            <button onClick={() => router.push('/?category=Recommended')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'Recommended' ? 'bg-sky-600/90 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-500' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
              <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> 站长推荐</span>
            </button>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            {categoriesData.map((cat) => (
              <button key={cat.category} onClick={() => router.push(`/?category=${cat.category}`)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${currentCategory === cat.category ? 'bg-slate-800/80 text-sky-400 ring-1 ring-slate-700' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
                <span>{cat.category}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${currentCategory === cat.category ? 'bg-sky-900/30 text-sky-300' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>{cat._count.category}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-slate-800/50">
              <button onClick={() => router.push('/admin')} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-sky-400 transition py-2 rounded-lg hover:bg-slate-800/50">管理控制台</button>
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
          <header className="md:hidden mb-8 flex justify-between items-center bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 sticky top-0 z-50 shadow-lg">
               <h1 className="text-xl font-bold text-white">MyNav</h1>
               <button onClick={() => router.push('/admin')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-sky-400">Admin</button>
          </header>

          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-md">
                      {currentCategory === 'All' ? '全部工具' : (currentCategory === 'Recommended' ? '站长推荐' : currentCategory)}
                  </h2>
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></span>
                      {searchQuery ? `搜索 "${searchQuery}" 的结果` : `收录了 ${links.length} 个优质资源`}
                  </p>
              </div>
              <form onSubmit={handleSearch} className="relative w-full md:w-80 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
                  <input type="text" name="query" defaultValue={searchQuery} placeholder="搜索资源..." className="w-full bg-slate-900/40 border border-slate-700/50 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all shadow-lg backdrop-blur-sm" />
              </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {links.map((link) => (
              <a 
                key={link.id} 
                href={formatUrl(link.url)} 
                target="_blank" 
                rel="noopener noreferrer" 
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col h-full overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500"></div>
                
                <div className="flex items-start justify-between mb-5 relative z-10 translate-z-10" style={{ transform: 'translateZ(20px)' }}>
                  <div className="w-12 h-12 bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 group-hover:border-sky-500/30 group-hover:scale-105 transition-all duration-300 shadow-sm backdrop-blur-sm">
                      <img src={getFaviconUrl(link.url)} alt="icon" className="w-full h-full object-contain opacity-90 group-hover:opacity-100 filter grayscale-[20%] group-hover:grayscale-0 transition-all" loading="lazy" />
                  </div>
                  <span className="text-[10px] font-medium tracking-wide bg-slate-800/60 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700/50 backdrop-blur-sm">{link.category}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1 mb-2 tracking-tight translate-z-10" style={{ transform: 'translateZ(10px)' }}>{link.title}</h3>
                {link.description && <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1 group-hover:text-slate-400 transition-colors">{link.description}</p>}
                
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-sky-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </div>
              </a>
            ))}
            {links.length === 0 && <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20"><p className="text-slate-400 font-medium">没有找到相关资源</p></div>}
          </div>
        </main>
      </div>

      {/* --- ✨ 设置悬浮按钮 --- */}
      <button 
        onClick={() => setShowSettings(true)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/20 transition-all duration-300 group"
      >
        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      </button>

      {/* --- ✨ 设置面板弹窗 --- */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                        视觉设置
                    </h2>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                
                <div className="space-y-4">
                    {/* 开关组件 (移除了极光选项) */}
                    {[
                        { key: 'tilt', label: '3D 悬停视差', desc: '鼠标悬停时卡片倾斜' },
                        { key: 'glow', label: '鼠标跟随光晕', desc: '跟随鼠标的聚光灯效果' },
                        { key: 'noise', label: '胶片噪点质感', desc: '增加画面纹理细节' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition">
                            <div>
                                <div className="text-sm font-medium text-slate-200">{item.label}</div>
                                <div className="text-xs text-slate-500">{item.desc}</div>
                            </div>
                            <button 
                                onClick={() => toggleSetting(item.key as keyof typeof settings)}
                                className={`w-11 h-6 flex items-center rounded-full transition-colors duration-300 ${settings[item.key as keyof typeof settings] ? 'bg-sky-600' : 'bg-slate-700'}`}
                            >
                                <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-600">设置将自动保存在浏览器中</p>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
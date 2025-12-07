// app/components/ClientHome.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// --- 类型定义 ---
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
  announcement: string
}

type ThemeMode = 'default' | 'slideshow'
type TransitionEffect = 'fade' | 'zoom' | 'pan'

// --- 壁纸配置 ---
const WALLPAPER_CONFIG = {
  morning: [
    "/wallpapers/morning/1.jpg",
    "/wallpapers/morning/2.jpg", 
    "/wallpapers/morning/3.jpg",
  ],
  afternoon: [
    "/wallpapers/afternoon/1.jpg",
    "/wallpapers/afternoon/2.jpg",
    "/wallpapers/afternoon/3.jpg",
  ],
  night: [
    "/wallpapers/night/1.jpg",
    "/wallpapers/night/2.jpg",
    "/wallpapers/night/3.jpg",
  ]
}

// 工具函数
function formatUrl(url: string) { if (!url) return '#'; const cleanUrl = url.trim(); if (!cleanUrl.startsWith('http')) return `https://${cleanUrl}`; return cleanUrl; }
function getFaviconUrl(rawUrl: string) { try { const hostname = new URL(formatUrl(rawUrl)).hostname; return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`; } catch { return "https://www.google.com/s2/favicons?domain=google.com&sz=128"; } }

function getTimeSlot(): 'morning' | 'afternoon' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

export default function ClientHome({ links, categoriesData, currentCategory, searchQuery, announcement }: ClientHomeProps) {
  const router = useRouter()
  
  // --- 状态管理 ---
  const [settings, setSettings] = useState({
    noise: false,
    glow: false,
    tilt: false,
    themeMode: 'slideshow' as ThemeMode,
    bgBlur: 0,          // 默认背景清晰
    cardOpacity: 0.1,   // ✨ 修改点：默认 10% 不透明度
    boardOpacity: 0.1,  // ✨ 修改点：默认 10% 不透明度
    uiBlur: 2,          // 默认微磨砂
    slideshowEffect: 'fade' as TransitionEffect // 默认柔和淡入
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'effects' | 'theme'>('theme')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  // 轮播相关状态
  const [currentWallpaperSet, setCurrentWallpaperSet] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeSlotName, setTimeSlotName] = useState('')

  // 初始化设置
  useEffect(() => {
    const saved = localStorage.getItem('nav_settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      const validMode = parsed.themeMode === 'static' ? 'default' : (parsed.themeMode || 'slideshow')
      setSettings(prev => ({ 
        ...prev, 
        ...parsed, 
        themeMode: validMode,
        bgBlur: parsed.bgBlur ?? 0,
        cardOpacity: parsed.cardOpacity ?? 0.1,  // ✨ 读取存档时也应用新默认值作为 fallback
        boardOpacity: parsed.boardOpacity ?? 0.1, // ✨
        uiBlur: parsed.uiBlur ?? 2,
        slideshowEffect: parsed.slideshowEffect ?? 'fade'
      }))
    }
  }, [])

  // 初始化壁纸逻辑
  useEffect(() => {
    const slot = getTimeSlot()
    setCurrentWallpaperSet(WALLPAPER_CONFIG[slot])
    const slotMap = { morning: '早晨', afternoon: '午后', night: '深夜' }
    setTimeSlotName(slotMap[slot])
  }, [])

  // 保存设置
  const updateSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('nav_settings', JSON.stringify(newSettings))
  }

  // 轮播图计时器
  useEffect(() => {
    if (settings.themeMode !== 'slideshow') return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % currentWallpaperSet.length)
      const newSlot = getTimeSlot()
      const newSet = WALLPAPER_CONFIG[newSlot]
      if (newSet !== currentWallpaperSet) {
         setCurrentWallpaperSet(newSet)
         const slotMap = { morning: '早晨', afternoon: '午后', night: '深夜' }
         setTimeSlotName(slotMap[newSlot])
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [settings.themeMode, currentWallpaperSet])

  // 鼠标光晕
  useEffect(() => {
    if (!settings.glow) return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [settings.glow])

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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('query') as string
    const categoryParam = currentCategory !== 'Recommended' && currentCategory !== 'All' ? `&category=${currentCategory}` : ''
    router.push(`/?query=${query}${categoryParam}`)
  }

  // 动态特效 CSS
  const getSlideStyle = (index: number) => {
    const isActive = index === currentSlide
    const baseClass = "absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[3000ms] ease-in-out"
    let transformClass = ""
    const opacityClass = isActive ? "opacity-100" : "opacity-0"

    if (settings.slideshowEffect === 'zoom') {
        transformClass = isActive ? "scale-110" : "scale-100"
    } else if (settings.slideshowEffect === 'pan') {
        transformClass = isActive ? "translate-x-0 scale-105" : "translate-x-[5%] scale-105"
    } else {
        transformClass = "scale-100"
    }
    return `${baseClass} ${opacityClass} ${transformClass}`
  }

  return (
    <div className="relative min-h-screen text-slate-300 font-sans selection:bg-sky-500/30 overflow-hidden bg-[#0f172a]">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.4); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.8); }
        
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #38bdf8; cursor: pointer; margin-top: -6px; box-shadow: 0 0 10px rgba(56,189,248,0.5); }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #334155; border-radius: 2px; }
      `}</style>

      {/* --- 背景层 --- */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${settings.themeMode === 'default' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-[#0f172a] to-[#0f172a]"></div>
      </div>

      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${settings.themeMode === 'slideshow' ? 'opacity-100' : 'opacity-0'}`}>
        {currentWallpaperSet.map((wp, index) => (
          <div 
            key={wp}
            className={getSlideStyle(index)}
            style={{ backgroundImage: `url(${wp})` }}
          >
             <div 
                className="absolute inset-0 transition-all duration-500"
                style={{ 
                    backdropFilter: `blur(${settings.bgBlur}px)`,
                    backgroundColor: `rgba(0,0,0,${timeSlotName === '深夜' ? 0.4 : 0.2})` 
                }}
             ></div>
          </div>
        ))}
      </div>

      {settings.noise && <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>}
      {settings.glow && <div className="fixed z-0 pointer-events-none w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[80px] transition-transform duration-75 will-change-transform" style={{ left: mousePos.x - 300, top: mousePos.y - 300 }} />}

      {/* --- 主界面 --- */}
      <div className="relative z-10 flex h-screen">
        {/* 左侧侧边栏 */}
        <aside 
            className="w-64 border-r border-slate-800/40 bg-slate-900/60 flex-col hidden md:flex h-full transition-all duration-300"
            style={{ backdropFilter: `blur(${settings.uiBlur}px)` }}
        >
          <div className="p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Oasis</h1>
            <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Your Digital Sanctuary</p>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
            <button onClick={() => router.push('/?category=All')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'All' ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
              <span>全部工具</span><span className={`text-[10px] px-2 py-0.5 rounded-md ${currentCategory === 'All' ? 'bg-sky-700/50 text-white' : 'bg-slate-800'}`}>All</span>
            </button>
            <button onClick={() => router.push('/?category=Recommended')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'Recommended' ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
              <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> 站长推荐</span>
            </button>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            {categoriesData.map((cat) => (
              <button key={cat.category} onClick={() => router.push(`/?category=${cat.category}`)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${currentCategory === cat.category ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}>
                <span>{cat.category}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${currentCategory === cat.category ? 'bg-sky-700/50 text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>{cat._count.category}</span>
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
               <h1 className="text-xl font-bold text-white">Oasis</h1>
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

          {/* 公告板 */}
          <div 
            className="mb-12 rounded-2xl border p-5 relative overflow-hidden group transition-all duration-300"
            style={{ 
                backgroundColor: `rgba(99, 102, 241, ${settings.boardOpacity})`,
                borderColor: `rgba(99, 102, 241, ${Math.min(settings.boardOpacity + 0.1, 0.5)})`,
                backdropFilter: `blur(${settings.uiBlur}px)`
            }}
          >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors"></div>
              <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-indigo-200 mb-1 flex items-center gap-2">系统公告<span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">News</span></h3>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-2xl whitespace-pre-wrap">
                          {announcement}
                      </p>
                  </div>
              </div>
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
                className="group relative backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col h-full overflow-hidden"
                style={{ 
                    transformStyle: 'preserve-3d',
                    backgroundColor: `rgba(15, 23, 42, ${settings.cardOpacity})`,
                    backdropFilter: `blur(${settings.uiBlur}px)`
                }}
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

      <button onClick={() => setShowSettings(true)} className="fixed bottom-6 right-6 z-50 p-3 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/20 transition-all duration-300 group">
        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      </button>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex border-b border-slate-800">
                    <button onClick={() => setActiveTab('theme')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'theme' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>主题背景</button>
                    <button onClick={() => setActiveTab('effects')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'effects' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>视觉特效</button>
                </div>
                <div className="p-6">
                    {activeTab === 'theme' && (
                        <div className="space-y-4">
                            <div className="text-sm text-slate-400 mb-2">选择背景模式：</div>
                            <button onClick={() => updateSetting('themeMode', 'default')} className={`w-full flex items-center p-3 rounded-xl border transition-all ${settings.themeMode === 'default' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'}`}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-900 to-[#0f172a] border border-slate-600 mr-3"></div>
                                <div className="text-left"><div className="font-medium">默认深色</div><div className="text-[10px] opacity-70">极简深蓝径向渐变</div></div>
                            </button>
                            <button onClick={() => updateSetting('themeMode', 'slideshow')} className={`w-full flex items-center p-3 rounded-xl border transition-all ${settings.themeMode === 'slideshow' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'}`}>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-sky-500 border border-slate-600 mr-3 flex items-center justify-center relative overflow-hidden"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=100&auto=format&fit=crop')] bg-cover"></div></div>
                                <div className="text-left"><div className="font-medium">智能轮播</div><div className="text-[10px] opacity-70">根据时间段自动切换风景</div></div>
                            </button>
                            
                            {/* ✨✨✨ 修复：找回了轮播切换效果选择器 ✨✨✨ */}
                            {settings.themeMode === 'slideshow' && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <div className="text-xs text-slate-400 mb-3">切换动画效果：</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'fade', label: '柔和淡入' },
                                            { id: 'zoom', label: '呼吸缩放' },
                                            { id: 'pan', label: '全景运镜' },
                                        ].map((effect) => (
                                            <button
                                                key={effect.id}
                                                onClick={() => updateSetting('slideshowEffect', effect.id)}
                                                className={`py-2 text-xs rounded-lg border transition-all ${
                                                    settings.slideshowEffect === effect.id
                                                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-medium'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                {effect.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                {[{ key: 'tilt', label: '3D 悬停视差' }, { key: 'glow', label: '鼠标跟随光晕' }, { key: 'noise', label: '胶片噪点质感' }].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">{item.label}</span>
                                        <button onClick={() => updateSetting(item.key as keyof typeof settings, !settings[item.key as keyof typeof settings])} className={`w-10 h-5 flex items-center rounded-full transition-colors duration-300 ${settings[item.key as keyof typeof settings] ? 'bg-sky-600' : 'bg-slate-700'}`}><span className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings[item.key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="w-full h-px bg-slate-800"></div>
                            <div className="space-y-5">
                                <div><div className="flex justify-between text-xs mb-2"><span className="text-slate-400">背景模糊度</span><span className="text-sky-400">{settings.bgBlur}px</span></div><input type="range" min="0" max="20" step="1" value={settings.bgBlur} onChange={(e) => updateSetting('bgBlur', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>
                                <div><div className="flex justify-between text-xs mb-2"><span className="text-slate-400">网站卡片不透明度</span><span className="text-sky-400">{Math.round(settings.cardOpacity * 100)}%</span></div><input type="range" min="0" max="1.0" step="0.05" value={settings.cardOpacity} onChange={(e) => updateSetting('cardOpacity', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>
                                <div><div className="flex justify-between text-xs mb-2"><span className="text-slate-400">公告板不透明度</span><span className="text-sky-400">{Math.round(settings.boardOpacity * 100)}%</span></div><input type="range" min="0" max="1.0" step="0.05" value={settings.boardOpacity} onChange={(e) => updateSetting('boardOpacity', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>
                                <div><div className="flex justify-between text-xs mb-2"><span className="text-slate-400">界面磨砂感 (Blur)</span><span className="text-sky-400">{settings.uiBlur}px</span></div><input type="range" min="0" max="40" step="2" value={settings.uiBlur} onChange={(e) => updateSetting('uiBlur', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
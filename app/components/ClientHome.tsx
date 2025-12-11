// app/components/ClientHome.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
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

type ThemeItem = {
  id: number
  name: string
  morning: string
  afternoon: string
  night: string
}

type ClientHomeProps = {
  links: LinkItem[]
  categoriesData: CategoryData[]
  currentCategory: string
  searchQuery: string
  announcement: string
  smartThemes: ThemeItem[]
  initialSettings: any 
}

type ThemeMode = 'default' | 'slideshow'
type TransitionEffect = 'fade' | 'zoom' | 'pan'
type WallpaperSource = 'smart' | 'custom'
type ClickEffectType = 'none' | 'ripple' | 'particles' | 'bubble'

// --- 默认壁纸配置 ---
const DEFAULT_WALLPAPER_CONFIG = {
  morning: ["/wallpapers/morning/1.jpg", "/wallpapers/morning/2.jpg", "/wallpapers/morning/3.jpg"],
  afternoon: ["/wallpapers/afternoon/1.jpg", "/wallpapers/afternoon/2.jpg", "/wallpapers/afternoon/3.jpg"],
  night: ["/wallpapers/night/1.jpg", "/wallpapers/night/2.jpg", "/wallpapers/night/3.jpg"]
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

export default function ClientHome({ links, categoriesData, currentCategory, searchQuery, announcement, smartThemes, initialSettings }: ClientHomeProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // --- 默认兜底设置 ---
  const defaultSettings = {
    noise: false, glow: false, tilt: false,
    themeMode: 'slideshow' as ThemeMode,
    bgBlur: 0, cardOpacity: 0.1, boardOpacity: 0.1, uiBlur: 2,
    slideshowEffect: 'fade' as TransitionEffect,
    wallpaperSource: 'smart' as WallpaperSource,
    customWallpapers: [] as string[],
    activeThemeId: 'default',
    slideshowInterval: 30,
    descColor: '#94a3b8',
    clickEffect: 'ripple' as ClickEffectType
  }

  // --- 状态管理 ---
  const [settings, setSettings] = useState({ ...defaultSettings, ...initialSettings })
  const [isMounted, setIsMounted] = useState(false)
  
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'effects' | 'theme'>('theme')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  
  const [currentWallpaperSet, setCurrentWallpaperSet] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeSlotName, setTimeSlotName] = useState('')

  // ✨✨✨ 右键菜单状态管理 ✨✨✨
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean } | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  
  // 加载用户本地个性化设置
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('nav_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings((prev: any) => ({ ...prev, ...parsed }))
      } catch (e) { console.error("Failed to load local settings", e) }
    }
  }, [])

  // ✨✨✨ 关闭菜单的辅助函数 (带动画) ✨✨✨
  const closeMenu = () => {
    if (isClosing) return
    setIsClosing(true)
    // 延迟 500ms 等待动画播放完毕后再销毁 DOM
    setTimeout(() => {
        setContextMenu(null)
        setIsClosing(false)
    }, 500)
  }

  // ✨✨✨ 右键菜单事件监听 ✨✨✨
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault() // 阻止默认右键菜单
      
      if (contextMenu?.show && !isClosing) {
        // 如果已经打开，则播放关闭动画
        closeMenu()
      } else {
        // 如果没打开，直接打开
        setIsClosing(false)
        setContextMenu({ x: e.clientX, y: e.clientY, show: true })
      }
    }

    const handleClick = () => {
      // 点击任意处关闭
      if (contextMenu?.show && !isClosing) closeMenu()
    }

    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', handleClick)
    }
  }, [contextMenu, isClosing])

  // 保存设置到本地
  const updateSetting = (key: keyof typeof settings, value: any) => {
    try {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        localStorage.setItem('nav_settings', JSON.stringify(newSettings))
        setErrorMsg('')
    } catch (e) { 
        setErrorMsg("浏览器存储空间不足") 
    }
  }

  // ... (点击特效代码保持不变) ...
  useEffect(() => {
    if (settings.clickEffect === 'none') return

    const handleClick = (e: MouseEvent) => {
      if (e.button === 2) return

      const x = e.clientX
      const y = e.clientY
      const container = document.createElement('div')
      container.className = 'fixed pointer-events-none z-[9999] top-0 left-0 w-full h-full overflow-hidden'
      document.body.appendChild(container)

      if (settings.clickEffect === 'ripple') {
        const count = 3; 
        for (let i = 0; i < count; i++) {
            const ripple = document.createElement('div')
            ripple.className = 'absolute rounded-full border-2 border-sky-400/60 bg-sky-400/10 shadow-[0_0_15px_rgba(56,189,248,0.3)] will-change-transform'
            ripple.style.left = `${x}px`
            ripple.style.top = `${y}px`
            const size = 20 + i * 15
            ripple.style.width = `${size}px`
            ripple.style.height = `${size}px`
            ripple.style.marginLeft = `-${size/2}px`
            ripple.style.marginTop = `-${size/2}px`
            ripple.style.animation = `refined-ripple 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards ${i * 0.1}s`
            container.appendChild(ripple)
        }
        setTimeout(() => container.remove(), 1200)
      }

      if (settings.clickEffect === 'particles') {
        const count = 16;
        const colors = ['#38bdf8', '#818cf8', '#c084fc', '#22d3ee', '#ffffff']
        for (let i = 0; i < count; i++) {
          const particle = document.createElement('div')
          const isCircle = Math.random() > 0.3
          particle.className = `absolute will-change-transform ${isCircle ? 'rounded-full' : 'rounded-sm'} shadow-sm`
          particle.style.left = `${x}px`
          particle.style.top = `${y}px`
          particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
          const size = Math.random() * 4 + 3 + 'px'
          particle.style.width = size
          particle.style.height = size
          const angle = Math.random() * Math.PI * 2
          const velocity = 80 + Math.random() * 100 
          const tx = Math.cos(angle) * velocity
          const ty = Math.sin(angle) * velocity - 50 
          const rotation = Math.random() * 360
          particle.style.setProperty('--tx', `${tx}px`)
          particle.style.setProperty('--ty', `${ty}px`)
          particle.style.setProperty('--r', `${rotation}deg`)
          particle.style.animation = `refined-particle 1s cubic-bezier(0.215, 0.61, 0.355, 1) forwards`
          container.appendChild(particle)
        }
        setTimeout(() => container.remove(), 1100)
      }

      if (settings.clickEffect === 'bubble') {
         const count = 5; 
         for(let i = 0; i < count; i++) {
            const bubble = document.createElement('div')
            bubble.className = 'absolute rounded-full border border-sky-300/40 bg-gradient-to-br from-white/40 to-transparent shadow-[inset_0_0_10px_rgba(255,255,255,0.3)] backdrop-blur-[1px] will-change-transform'
            bubble.style.left = `${x}px`
            bubble.style.top = `${y}px`
            const size = Math.random() * 25 + 10
            bubble.style.width = `${size}px`
            bubble.style.height = `${size}px`
            const xOffset = (Math.random() - 0.5) * 40
            bubble.style.marginLeft = `-${size/2 + xOffset}px`
            bubble.style.marginTop = `-${size/2}px`
            const delay = Math.random() * 0.3
            const duration = 1.2 + Math.random() * 0.5
            bubble.style.animation = `refined-bubble-rise ${duration}s ease-in forwards ${delay}s, refined-bubble-wobble ${duration*1.5}s ease-in-out infinite alternate ${delay}s`
            container.appendChild(bubble)
         }
         setTimeout(() => container.remove(), 2000)
      }
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [settings.clickEffect])

  // ... (壁纸逻辑保持不变) ...
  useEffect(() => {
    let newSet: string[] = []
    let newSlotName = ''
    if (settings.wallpaperSource === 'custom' && settings.customWallpapers.length > 0) {
        newSet = settings.customWallpapers
        newSlotName = '自定义'
    } else {
        const slot = getTimeSlot()
        const slotMap = { morning: '早晨', afternoon: '午后', night: '深夜' }
        newSlotName = slotMap[slot]
        const selectedTheme = smartThemes.find(t => String(t.id) === String(settings.activeThemeId))
        if (selectedTheme) {
            const raw = selectedTheme[slot]
            newSet = raw.split(/[\n,]/).map(s => s.trim()).filter(s => s)
        } else {
            newSet = DEFAULT_WALLPAPER_CONFIG[slot]
        }
    }
    if (isMounted && JSON.stringify(newSet) !== JSON.stringify(currentWallpaperSet)) {
      setCurrentWallpaperSet(newSet)
      setTimeSlotName(newSlotName)
      setCurrentSlide(0)
    }
  }, [settings.wallpaperSource, settings.customWallpapers, settings.activeThemeId, smartThemes, isMounted])

  useEffect(() => {
    if (settings.themeMode !== 'slideshow' || currentWallpaperSet.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % currentWallpaperSet.length)
    }, settings.slideshowInterval * 1000)
    return () => clearInterval(timer)
  }, [settings.themeMode, currentWallpaperSet, settings.slideshowInterval])

  useEffect(() => {
    if (!settings.glow) return
    const handleMouseMove = (e: MouseEvent) => { setMousePos({ x: e.clientX, y: e.clientY }) }
    window.addEventListener('mousemove', handleMouseMove); return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [settings.glow])

  const handleCardMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!settings.tilt) return
    const card = e.currentTarget; const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const centerX = rect.width / 2; const centerY = rect.height / 2; const rotateX = ((y - centerY) / centerY) * -5; const rotateY = ((x - centerX) / centerX) * 5; card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
  }
  const handleCardMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.transform = '' }
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const query = formData.get('query') as string; const categoryParam = currentCategory !== 'Recommended' && currentCategory !== 'All' ? `&category=${currentCategory}` : ''; router.push(`/?query=${query}${categoryParam}`) }
  
  const getSlideStyle = (index: number) => {
    const isActive = index === currentSlide
    const baseClass = "absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[3000ms] ease-in-out"
    let transformClass = ""
    const opacityClass = isActive ? "opacity-100" : "opacity-0"
    if (settings.slideshowEffect === 'zoom') { transformClass = isActive ? "scale-110" : "scale-100" } else if (settings.slideshowEffect === 'pan') { transformClass = isActive ? "translate-x-0 scale-105" : "translate-x-[5%] scale-105" } else { transformClass = "scale-100" }
    return `${baseClass} ${opacityClass} ${transformClass}`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
        if (file.size > 1.5 * 1024 * 1024) { alert(`图片 ${file.name} 太大了`); return; }
        const reader = new FileReader(); 
        reader.onload = (event) => { 
            const base64String = event.target?.result as string; 
            if (base64String) { 
                setSettings((prev: any) => { 
                    try { 
                        const newSettings = { ...prev, customWallpapers: [...prev.customWallpapers, base64String], wallpaperSource: 'custom' as WallpaperSource }; 
                        localStorage.setItem('nav_settings', JSON.stringify(newSettings)); 
                        return newSettings 
                    } catch (err) { 
                        alert("浏览器存储空间已满"); 
                        return prev 
                    } 
                }) 
            } 
        }; 
        reader.readAsDataURL(file)
    }); if (fileInputRef.current) fileInputRef.current.value = ''
  }
  
  const handleRemoveCustomWallpaper = (targetIndex: number) => { 
      const newCustomWallpapers = settings.customWallpapers.filter((_: string, idx: number) => idx !== targetIndex); 
      const newSettings = { ...settings, customWallpapers: newCustomWallpapers };
      if (newCustomWallpapers.length === 0) { newSettings.wallpaperSource = 'smart' }
      setSettings(newSettings);
      localStorage.setItem('nav_settings', JSON.stringify(newSettings));
  }

  // ✨✨✨ 环形菜单配置 (自定义菜单项) ✨✨✨
  const menuItems = [
    { label: '音乐', action: () => {} },
    { 
        label: '博客', 
        action: () => router.push('/blog') // ✨ 核心修改：添加跳转逻辑
    },
    { 
      label: '便利贴', 
      action: () => router.push('/notes') 
    },
    { 
      label: '看板娘', 
      action: () => {
        const waifu = document.getElementById('waifu');
        if (waifu) {
          // 获取当前的显示状态
          // 注意：有时候 style.display 是空的，所以结合 getComputedStyle 判断更稳健，
          // 但简单的内联样式判断通常对这种手动切换也足够。
          const isVisible = waifu.style.display !== 'none';

          if (isVisible) {
            // 🛑 如果当前是显示状态 -> 隐藏它
            waifu.style.display = 'none';
            // 写入 localStorage，让 autoload.js 知道用户想要隐藏它（防止刷新后自动弹出来）
            localStorage.setItem('waifu-display', Date.now().toString()); 
          } else {
            // ✨ 如果当前是隐藏状态 -> 显示它
            waifu.style.display = 'block';
            waifu.style.bottom = '0'; // 确保位置复位
            // 清除隐藏标记
            localStorage.removeItem('waifu-display'); 
          }
        }
      } 
    },
    { label: '其他', action: () => {} },
    { label: '其他', action: () => {} },
  ]

  return (
    <div className="relative min-h-screen text-slate-300 font-sans selection:bg-sky-500/30 overflow-hidden bg-[#0f172a]">
      {/* ✨ 精致版动画定义 + 轮盘双向动画 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.4); border-radius: 20px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.8); }
        input[type=range] { -webkit-appearance: none; background: transparent; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #38bdf8; cursor: pointer; margin-top: -6px; box-shadow: 0 0 10px rgba(56,189,248,0.5); } input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #334155; border-radius: 2px; }

        @keyframes refined-ripple { 0% { transform: scale(0); opacity: 1; border-width: 4px; } 50% { opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; border-width: 1px; } }
        @keyframes refined-particle { 0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; } 60% { opacity: 0.8; } 100% { transform: translate(var(--tx), calc(var(--ty) + 100px)) rotate(var(--r)) scale(0); opacity: 0; } }
        @keyframes refined-bubble-rise { 0% { transform: translateY(0) scale(0.8); opacity: 0; } 20% { opacity: 0.7; } 100% { transform: translateY(-150px) scale(1.1); opacity: 0; } }
        @keyframes refined-bubble-wobble { 0% { margin-left: -5px; } 100% { margin-left: 5px; } }

        /* 打开动画：容器整体旋转放大 (螺旋弹出) */
        @keyframes wheel-open {
          0% { transform: scale(0) rotate(-720deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        /* 关闭动画：容器整体旋转缩小 (螺旋消失) */
        @keyframes wheel-close {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0) rotate(-720deg); opacity: 0; }
        }
      `}</style>

      {/* ... (背景、噪声、光晕保持不变) ... */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${settings.themeMode === 'default' ? 'opacity-100' : 'opacity-0'}`}><div className="absolute inset-0 bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-[#0f172a] to-[#0f172a]"></div></div>
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${settings.themeMode === 'slideshow' ? 'opacity-100' : 'opacity-0'}`}>
        {currentWallpaperSet.length > 0 ? currentWallpaperSet.map((wp: string, index: number) => (
          <div key={index} className={getSlideStyle(index)} style={{ backgroundImage: `url(${wp})` }}>
             <div className="absolute inset-0 transition-all duration-500" style={{ backdropFilter: `blur(${settings.bgBlur}px)`, backgroundColor: `rgba(0,0,0,${settings.wallpaperSource === 'custom' ? 0.2 : (timeSlotName === '深夜' ? 0.4 : 0.2)})` }}></div>
          </div>
        )) : <div className="absolute inset-0 bg-[#0f172a] flex items-center justify-center text-slate-500">请在设置中添加壁纸</div>}
      </div>

      {settings.noise && <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>}
      {settings.glow && <div className="fixed z-0 pointer-events-none w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[80px] transition-transform duration-75 will-change-transform" style={{ left: mousePos.x - 300, top: mousePos.y - 300 }} />}

      {/* ✨✨✨ 环形右键菜单渲染 (容器级螺旋动画) ✨✨✨ */}
      {contextMenu?.show && (
        <div 
          className="fixed z-[9999]" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* 将动画应用到这个包裹所有按钮的容器上 */}
          <div 
            className="relative group"
            style={{
              animation: `${isClosing ? 'wheel-close' : 'wheel-open'} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
              transformOrigin: 'center center'
            }}
          >
             {menuItems.map((item, i) => {
                const radius = 80;
                // 角度计算：从12点钟(-90deg)开始，顺时针排列
                const angle = (i * 60 - 90) * (Math.PI / 180);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); item.action(); closeMenu(); }}
                    className="absolute w-14 h-14 -ml-7 -mt-7 bg-slate-900/60 border border-white/10 rounded-full flex items-center justify-center shadow-2xl hover:bg-sky-600/90 hover:border-sky-400 hover:scale-110 transition-all duration-300 backdrop-blur-xl"
                    style={{
                      left: x,
                      top: y,
                    }}
                  >
                     {/* 纯文本，居中显示，移除所有SVG */}
                     <span className="text-xs font-medium text-slate-200 hover:text-white pointer-events-none select-none">
                        {item.label}
                     </span>
                  </button>
                )
             })}
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-screen">
        <aside className="w-64 border-r border-slate-800/40 bg-slate-900/60 flex-col hidden md:flex h-full transition-all duration-300" style={{ backdropFilter: `blur(${settings.uiBlur}px)` }}>
          <div className="p-8"><h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Oasis</h1><p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Your Digital Sanctuary</p></div>
          <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
            <button onClick={() => router.push('/?category=All')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'All' ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}><span>全部工具</span><span className={`text-[10px] px-2 py-0.5 rounded-md ${currentCategory === 'All' ? 'bg-sky-700/50 text-white' : 'bg-slate-800'}`}>All</span></button>
            <button onClick={() => router.push('/?category=Recommended')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'Recommended' ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}><span className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> 站长推荐</span></button>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            {categoriesData.map((cat) => (<button key={cat.category} onClick={() => router.push(`/?category=${cat.category}`)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${currentCategory === cat.category ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800/40 hover:text-white text-slate-400'}`}><span>{cat.category}</span><span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${currentCategory === cat.category ? 'bg-sky-700/50 text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>{cat._count.category}</span></button>))}
          </nav>
          <div className="p-4 border-t border-slate-800/50"><button onClick={() => router.push('/admin')} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-sky-400 transition py-2 rounded-lg hover:bg-slate-800/50">管理控制台</button></div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
          <header className="md:hidden mb-8 flex justify-between items-center bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 sticky top-0 z-50 shadow-lg"><h1 className="text-xl font-bold text-white">Oasis</h1><button onClick={() => router.push('/admin')} className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-sky-400">Admin</button></header>
          <div className="mb-10 flex flex-col md:block relative gap-6 md:h-20">
              {/* 标题区域：桌面端绝对定位在左侧垂直居中 */}
              <div className="md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 z-10 mb-4 md:mb-0">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-md">
                      {currentCategory === 'All' ? '全部工具' : (currentCategory === 'Recommended' ? '站长推荐' : currentCategory)}
                  </h2>
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></span>
                      {searchQuery ? `搜索 "${searchQuery}" 的结果` : `收录了 ${links.length} 个优质资源`}
                  </p>
              </div>
              
              {/* 搜索框：桌面端使用 margin 自动居中 (mx-auto) 并适当加宽 */}
              <form onSubmit={handleSearch} className="relative w-full md:w-[500px] group md:mx-auto md:top-1/2 md:-translate-y-1/2 z-20">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                  </div>
                  <input 
                      type="text" 
                      name="query" 
                      defaultValue={searchQuery} 
                      placeholder="搜索资源..." 
                      className="w-full bg-slate-900/40 border border-slate-700/50 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all shadow-lg backdrop-blur-sm" 
                  />
              </form>
          </div>

          <div className="mb-12 rounded-2xl border p-5 relative overflow-hidden group transition-all duration-300" style={{ backgroundColor: `rgba(99, 102, 241, ${settings.boardOpacity})`, borderColor: `rgba(99, 102, 241, ${Math.min(settings.boardOpacity + 0.1, 0.5)})`, backdropFilter: `blur(${settings.uiBlur}px)` }}>
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors"></div>
              <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-indigo-500/20 rounded-lg text-indigo-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg></div>
                  <div><h3 className="text-sm font-bold text-indigo-200 mb-1 flex items-center gap-2">系统公告<span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">News</span></h3><p className="text-sm text-slate-300 leading-relaxed max-w-2xl whitespace-pre-wrap">{announcement}</p></div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {links.map((link) => (
              <a key={link.id} href={formatUrl(link.url)} target="_blank" rel="noopener noreferrer" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave} className="group relative backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col h-full overflow-hidden" style={{ transformStyle: 'preserve-3d', backgroundColor: `rgba(15, 23, 42, ${settings.cardOpacity})`, backdropFilter: `blur(${settings.uiBlur}px)` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500"></div>
                <div className="flex items-start justify-between mb-5 relative z-10 translate-z-10" style={{ transform: 'translateZ(20px)' }}>
                  <div className="w-12 h-12 bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 group-hover:border-sky-500/30 group-hover:scale-105 transition-all duration-300 shadow-sm backdrop-blur-sm"><img src={getFaviconUrl(link.url)} alt="icon" className="w-full h-full object-contain opacity-90 group-hover:opacity-100 filter grayscale-[20%] group-hover:grayscale-0 transition-all" loading="lazy" /></div>
                  <span className="text-[10px] font-medium tracking-wide bg-slate-800/60 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700/50 backdrop-blur-sm">{link.category}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1 mb-2 tracking-tight translate-z-10" style={{ transform: 'translateZ(10px)' }}>{link.title}</h3>
                {link.description && <p className="text-sm line-clamp-2 leading-relaxed flex-1 transition-colors" style={{ color: settings.descColor || '#94a3b8' }}>{link.description}</p>}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-sky-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg></div>
              </a>
            ))}
            {links.length === 0 && <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20"><p className="text-slate-400 font-medium">没有找到相关资源</p></div>}
          </div>
        </main>
      </div>

      <button onClick={() => setShowSettings(true)} className="fixed top-6 right-6 z-50 p-3 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/20 transition-all duration-300 group">
        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      </button>

      {/* ... (设置面板代码保持不变) ... */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex border-b border-slate-800">
                    <button onClick={() => setActiveTab('theme')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'theme' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>主题背景</button>
                    <button onClick={() => setActiveTab('effects')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'effects' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>视觉特效</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                    {activeTab === 'theme' && (
                        <div className="space-y-6">
                            <div>
                                <div className="text-sm text-slate-400 mb-3">选择背景模式：</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => updateSetting('themeMode', 'default')} className={`flex items-center justify-center p-3 rounded-xl border transition-all ${settings.themeMode === 'default' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'}`}><span className="text-sm font-medium">默认深色</span></button>
                                    <button onClick={() => updateSetting('themeMode', 'slideshow')} className={`flex items-center justify-center p-3 rounded-xl border transition-all ${settings.themeMode === 'slideshow' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'}`}><span className="text-sm font-medium">动态轮播</span></button>
                                </div>
                            </div>

                            {settings.themeMode === 'slideshow' && (
                                <div className="space-y-6 pt-4 border-t border-slate-800">
                                    <div>
                                        <div className="text-xs text-slate-400 mb-3">壁纸来源：</div>
                                        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                                            <button onClick={() => updateSetting('wallpaperSource', 'smart')} className={`flex-1 py-2 text-xs rounded-md transition ${settings.wallpaperSource === 'smart' ? 'bg-slate-800 text-sky-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>智能推荐</button>
                                            <button onClick={() => updateSetting('wallpaperSource', 'custom')} className={`flex-1 py-2 text-xs rounded-md transition ${settings.wallpaperSource === 'custom' ? 'bg-slate-800 text-sky-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>本地自定义</button>
                                        </div>
                                    </div>

                                    {settings.wallpaperSource === 'smart' && smartThemes.length > 0 && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-2">选择主题：</div>
                                            <select value={settings.activeThemeId} onChange={(e) => updateSetting('activeThemeId', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500">
                                                <option value="default">默认风景</option>
                                                {smartThemes.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                            </select>
                                        </div>
                                    )}

                                    {settings.wallpaperSource === 'custom' && (
                                        <div className="space-y-4">
                                            <div className="flex justify-center">
                                                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg><span>选择图片 (支持多选)</span></button>
                                            </div>
                                            {errorMsg && <p className="text-xs text-red-400 text-center">{errorMsg}</p>}
                                            {settings.customWallpapers.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-900/50 rounded-xl border border-slate-800/50 max-h-48 overflow-y-auto custom-scrollbar">
                                                    {settings.customWallpapers.map((path: string, idx: number) => (
                                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700">
                                                            <img src={path} alt="custom" className="w-full h-full object-cover" />
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveCustomWallpaper(idx); }} className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p className="text-center text-xs text-slate-500 py-4 border-2 border-dashed border-slate-800 rounded-xl">暂无本地壁纸</p>}
                                        </div>
                                    )}

                                    <div><div className="text-xs text-slate-400 mb-3">切换动画效果：</div><div className="grid grid-cols-3 gap-2">{[{ id: 'fade', label: '柔和淡入' }, { id: 'zoom', label: '呼吸缩放' }, { id: 'pan', label: '全景运镜' }].map((effect) => (<button key={effect.id} onClick={() => updateSetting('slideshowEffect', effect.id)} className={`py-2 text-xs rounded-lg border transition-all ${settings.slideshowEffect === effect.id ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-medium' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{effect.label}</button>))}</div></div>
                                    
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-slate-400">轮播间隔时间</span>
                                            <span className="text-sky-400">{settings.slideshowInterval}秒</span>
                                        </div>
                                        <input type="range" min="5" max="300" step="5" value={settings.slideshowInterval} onChange={(e) => updateSetting('slideshowInterval', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                        <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>5s</span><span>5min</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            <div>
                                <div className="text-xs text-slate-400 mb-3">鼠标点击特效：</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'none', label: '关闭' },
                                        { id: 'ripple', label: '波纹' },
                                        { id: 'particles', label: '粒子' },
                                        { id: 'bubble', label: '气泡' },
                                    ].map((effect) => (
                                        <button
                                            key={effect.id}
                                            onClick={() => updateSetting('clickEffect', effect.id)}
                                            className={`py-2 text-[10px] rounded-lg border transition-all ${
                                                settings.clickEffect === effect.id
                                                    ? 'bg-sky-500/20 border-sky-500 text-sky-400 font-medium'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {effect.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-800"></div>

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
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
                                    <span className="text-sm font-medium text-slate-200">描述文字颜色</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 font-mono">{settings.descColor}</span>
                                        <input 
                                            type="color" 
                                            value={settings.descColor}
                                            onChange={(e) => updateSetting('descColor', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                                        />
                                    </div>
                                </div>
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
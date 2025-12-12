'use client'

import { useState, useRef, useEffect } from 'react'
// ✨ 1. 引入 logoutAdmin
import { createNote, updateNote, deleteNote, updateNotePosition, loginAdmin, logoutAdmin, updateNotesBgSettings } from '../actions'
import { useRouter } from 'next/navigation' // ✨ 引入 router 用于刷新

// ... (类型定义和常量保持不变) ...
type NoteItem = {
  id: number
  content: string
  color: string
  createdAt: Date
  sortOrder: number
  x: number
  y: number
}

type BgSettings = {
  type: 'color' | 'image' | 'texture' | 'custom'
  value: string 
  blur?: boolean
}

const colorStyles: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 shadow-yellow-500/20 ring-yellow-400',
  pink:   'bg-pink-200 text-pink-900 shadow-pink-500/20 ring-pink-400',
  blue:   'bg-sky-200 text-sky-900 shadow-sky-500/20 ring-sky-400',
  green:  'bg-emerald-200 text-emerald-900 shadow-emerald-500/20 ring-emerald-400',
  purple: 'bg-purple-200 text-purple-900 shadow-purple-500/20 ring-purple-400',
}
const COLOR_OPTIONS = Object.keys(colorStyles)
const HEADER_HEIGHT = 140 

const BG_PRESETS = {
    colors: [
      { name: '深邃夜空', value: '#0f172a' },
      { name: '暖调米白', value: '#fdf6e3' },
      { name: '极简灰', value: '#e2e8f0' },
      { name: '护眼绿', value: '#e8f5e9' },
    ],
    textures: [
      { name: '网格纸', value: 'radial-gradient(#cbd5e1 1px, transparent 1px)', bgSize: '20px 20px', bgColor: '#f8fafc' },
      { name: '波点阵', value: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)', bgSize: '24px 24px', bgColor: '#1e293b' },
    ],
    images: [
      { name: '软木板', value: 'https://images.unsplash.com/photo-1596230327339-44677709eb40?q=80&w=2070&auto=format&fit=crop' },
      { name: '治愈风景', value: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop' },
    ]
  }

export default function NotesWallClient({ initialNotes, initialIsAdmin, initialBgSettings }: { initialNotes: NoteItem[], initialIsAdmin: boolean, initialBgSettings?: BgSettings }) {
  const router = useRouter() // ✨
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [isEditMode, setIsEditMode] = useState(false) 

  const [bgSettings, setBgSettings] = useState<BgSettings>(initialBgSettings || { type: 'color', value: '#0f172a' })
  const [showBgPanel, setShowBgPanel] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null)
  
  // ✨ 2. 新增：用户菜单状态
  const [showUserMenu, setShowUserMenu] = useState(false)

  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setNotes(initialNotes) }, [initialNotes])

  // 登录逻辑 (已更新为用户名+密码)
  const handleLogin = async (formData: FormData) => {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    
    const success = await loginAdmin(username, password)
    if (success) { 
        setIsAdmin(true); 
        setIsEditMode(true); // 登录后默认开启编辑模式，方便操作
        setShowAuthModal(false); 
        setAuthError('');
        router.refresh();
    } else { 
        setAuthError('账号或密码错误') 
    }
  }

  // ✨ 3. 新增：登出逻辑
  const handleLogout = async () => {
      await logoutAdmin()
      setIsAdmin(false)
      setIsEditMode(false)
      setShowUserMenu(false)
      setShowBgPanel(false)
      router.refresh()
  }

  // ... (handleSaveBg, handleMouseDown, handleMouseMove, handleMouseUp 保持不变) ...
  const handleSaveBg = async (newSettings: BgSettings) => {
    setBgSettings(newSettings)
    const formData = new FormData()
    formData.append('type', newSettings.type)
    formData.append('value', newSettings.value)
    if (newSettings.blur) formData.append('blur', 'on')
    await updateNotesBgSettings(formData)
  }

  const handleMouseDown = (e: React.MouseEvent, note: NoteItem) => {
    if (!isEditMode) return 
    const target = e.target as HTMLElement
    if (target.classList.contains('overflow-y-auto')) {
        const rect = target.getBoundingClientRect()
        if (e.clientX >= rect.right - 15) return 
    }
    e.stopPropagation()
    setDraggingId(note.id)
    dragOffset.current = { x: e.clientX - note.x, y: e.clientY - note.y }
    const maxZ = Math.max(...notes.map(n => n.sortOrder), 0) + 1
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, sortOrder: maxZ } : n))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return
    e.preventDefault()
    let newX = e.clientX - dragOffset.current.x
    let newY = e.clientY - dragOffset.current.y
    if (newY < HEADER_HEIGHT) newY = HEADER_HEIGHT
    if (newX < 0) newX = 0
    setNotes(prev => prev.map(n => n.id === draggingId ? { ...n, x: newX, y: newY } : n))
  }

  const handleMouseUp = async () => {
    if (draggingId !== null) {
      const currentId = draggingId
      const note = notes.find(n => n.id === currentId)
      setDraggingId(null)
      if (note) await updateNotePosition(currentId, note.x, note.y, note.sortOrder)
    }
  }

  const handleSubmitNote = async (formData: FormData) => {
    if (editingNote?.id) await updateNote(formData)
    else await createNote(formData)
    setEditingNote(null)
  }

  const getBackgroundStyle = () => {
    const base: React.CSSProperties = { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0, transition: 'background 0.5s ease' }
    if (bgSettings.type === 'color') return { ...base, backgroundColor: bgSettings.value }
    if (bgSettings.type === 'texture') {
        const preset = BG_PRESETS.textures.find(t => t.value === bgSettings.value)
        return { ...base, backgroundImage: bgSettings.value, backgroundColor: preset?.bgColor || '#f8fafc', backgroundSize: preset?.bgSize || 'auto' }
    }
    if (bgSettings.type === 'image' || bgSettings.type === 'custom') {
        return { ...base, backgroundImage: `url(${bgSettings.value})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: bgSettings.blur ? 'blur(8px)' : 'none', transform: bgSettings.blur ? 'scale(1.05)' : 'none' }
    }
    return base
  }

  const isLightBg = bgSettings.value === '#fdf6e3' || bgSettings.value === '#e2e8f0' || bgSettings.value === '#e8f5e9' || bgSettings.type === 'texture'
  const isPresetColor = (color: string) => colorStyles.hasOwnProperty(color)

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={getBackgroundStyle()} />
      {(bgSettings.type === 'image' || bgSettings.type === 'custom') && !bgSettings.blur && (
          <div className="absolute inset-0 bg-black/10 pointer-events-none z-0" />
      )}

      {/* Header */}
      <header className={`absolute top-0 left-0 w-full z-[9999] px-8 py-6 flex justify-between items-center h-[120px] transition-all duration-300 backdrop-blur-md ${isLightBg ? 'bg-white/30 text-slate-800 border-b border-white/20' : 'bg-black/20 text-white border-b border-white/5'}`}>
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-sm filter">Sticky Wall</h1>
          <p className={`text-xs mt-2 flex items-center gap-2 font-medium ${isLightBg ? 'text-slate-600' : 'text-slate-300/80'}`}>
            灵感碎片与备忘录 {isAdmin && <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/20 shadow-sm">[管理员]</span>}
          </p>
        </div>
        
        {/* Right Actions */}
        <div className="flex gap-3 items-center">
            {/* 仅在登录后显示的管理工具栏 */}
            {isAdmin && (
                <>
                    {/* 背景设置按钮 */}
                    <div className="relative">
                        <button onClick={() => setShowBgPanel(!showBgPanel)} className={`p-2 rounded-lg transition border backdrop-blur-sm ${showBgPanel ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-black/10 hover:bg-black/20 text-current border-transparent'}`} title="背景设置">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </button>
                        {/* 背景设置面板 (保持不变) */}
                        {showBgPanel && (
                            <div className="absolute top-12 right-0 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-4 animate-in zoom-in-95 origin-top-right text-slate-200 z-[10000]">
                                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">背景风格</h4>
                                <div className="space-y-4">
                                    <div><div className="text-[10px] text-slate-500 mb-2">纯色主题</div><div className="flex gap-2">{BG_PRESETS.colors.map(c => (<button key={c.value} onClick={() => handleSaveBg({ type: 'color', value: c.value })} className={`w-8 h-8 rounded-full border-2 transition ${bgSettings.value === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.value }} />))}</div></div>
                                    <div><div className="text-[10px] text-slate-500 mb-2">质感纹理</div><div className="grid grid-cols-2 gap-2">{BG_PRESETS.textures.map(t => (<button key={t.name} onClick={() => handleSaveBg({ type: 'texture', value: t.value })} className={`h-10 rounded-lg border text-xs transition relative overflow-hidden ${bgSettings.value === t.value ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`} style={{ backgroundImage: t.value, backgroundColor: t.bgColor, backgroundSize: t.bgSize }}><span className="relative z-10 bg-slate-900/80 px-1 rounded">{t.name}</span></button>))}</div></div>
                                    <div><div className="text-[10px] text-slate-500 mb-2">精选壁纸</div><div className="grid grid-cols-2 gap-2">{BG_PRESETS.images.map(img => (<button key={img.name} onClick={() => handleSaveBg({ type: 'image', value: img.value })} className={`h-16 rounded-lg border bg-cover bg-center transition ${bgSettings.value === img.value ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700 opacity-80 hover:opacity-100'}`} style={{ backgroundImage: `url(${img.value})` }}></button>))}</div></div>
                                    <div><div className="text-[10px] text-slate-500 mb-2">自定义图片 URL</div><input type="text" placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBg({ type: 'custom', value: e.currentTarget.value }) }} /></div>
                                    {(bgSettings.type === 'image' || bgSettings.type === 'custom') && (<label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-2 border-t border-slate-800"><input type="checkbox" checked={!!bgSettings.blur} onChange={(e) => handleSaveBg({ ...bgSettings, blur: e.target.checked })} className="rounded bg-slate-800 border-slate-600 accent-indigo-500" />背景模糊</label>)}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className={`w-px h-6 mx-1 ${isLightBg ? 'bg-slate-400/30' : 'bg-white/20'}`}></div>
                    
                    {/* 编辑模式开关 */}
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 font-medium border backdrop-blur-sm ${isEditMode ? 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white' : isLightBg ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20 hover:bg-emerald-600/20' : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20'}`}>
                        {isEditMode ? '预览' : '管理'}
                    </button>
                    
                    {/* 贴一张按钮 */}
                    {isEditMode && (
                        <button onClick={() => setEditingNote({ color: 'yellow' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-500/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> 贴一张
                        </button>
                    )}
                </>
            )}

            {/* ✨✨✨ 用户登录/登出 按钮 (仿导航页风格) ✨✨✨ */}
            <div className="relative">
                <button 
                    onClick={() => isAdmin ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
                    className={`flex items-center justify-center w-10 h-10 backdrop-blur border rounded-xl transition-all duration-300 shadow-sm group shrink-0
                        ${isAdmin 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                        : isLightBg 
                            ? 'bg-white/50 border-slate-300 text-slate-500 hover:bg-white hover:text-slate-800' 
                            : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        }`}
                    title={isAdmin ? "管理员已登录" : "管理员登录"}
                >
                    {isAdmin ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                    )}
                </button>

                {/* 用户下拉菜单 */}
                {isAdmin && showUserMenu && (
                    <div className="absolute right-0 top-12 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[10001] animate-in fade-in zoom-in-95 origin-top-right">
                        <div className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800">当前身份: 管理员</div>
                        <button onClick={() => router.push('/admin')} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-sky-400 transition-colors flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            后台管理
                        </button>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-colors flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            退出登录
                        </button>
                    </div>
                )}
            </div>

            <a href="/" className={`px-4 py-2 rounded-lg transition text-sm backdrop-blur-sm ${isLightBg ? 'bg-black/5 hover:bg-black/10 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}>返回</a>
        </div>
      </header>

      {/* Note Area */}
      <div className="w-full h-full relative z-10">
        {notes.map((note) => {
          const isDragging = draggingId === note.id
          const isHovered = isEditMode && hoveredId === note.id
          
          let dynamicZIndex = note.sortOrder
          if (isDragging) dynamicZIndex = 999999 
          else if (isHovered) dynamicZIndex = 999990

          const isPreset = isPresetColor(note.color)
          const customStyle = !isPreset ? { backgroundColor: note.color } : {}

          return (
            <div
              key={note.id}
              onMouseDown={(e) => handleMouseDown(e, note)}
              onMouseEnter={() => isEditMode && setHoveredId(note.id)}
              onMouseLeave={() => isEditMode && setHoveredId(null)}
              className={`
                group absolute flex flex-col p-6 w-[280px] min-h-[200px] rounded-sm
                ${isPreset ? colorStyles[note.color] : 'text-slate-900 shadow-xl ring-1 ring-black/5'}
                border border-black/50
                ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'animate-note-sway hover:[animation-play-state:paused]'}
                hover:ring-2 hover:ring-offset-2 hover:ring-offset-[#0f172a] 
                hover:scale-[1.02] hover:shadow-2xl
                transition duration-200 select-none
                ${isDragging ? 'duration-0 transition-none' : ''}
              `}
              style={{
                  left: note.x,
                  top: note.y,
                  zIndex: dynamicZIndex,
                  animationDuration: !isEditMode ? `${6 + (note.id % 5)}s` : '0s',
                  animationDelay: !isEditMode ? `${-(note.id % 5)}s` : '0s',
                  transform: isDragging ? 'scale(1.05)' : undefined,
                  ...customStyle
              }}
            >
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner z-10 pointer-events-none"></div>
              <div className="absolute top-[-8px] left-[calc(50%-2px)] w-1.5 h-1.5 rounded-full bg-white/30 z-20 pointer-events-none"></div>

              <div className="flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting overflow-y-auto max-h-[240px] pr-2 pointer-events-auto note-scrollbar select-text cursor-default">
                {note.content}
              </div>
              
              <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center h-8 relative">
                  <span className="opacity-60 text-xs font-mono pointer-events-none text-current">
                      {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="relative min-w-[60px] flex justify-end">
                      <span className={`font-bold opacity-40 text-xs font-mono transition-opacity duration-300 pointer-events-none ${isEditMode ? 'group-hover:opacity-0' : ''}`}>
                          #{note.id}
                      </span>
                      {isEditMode && (
                      <div onMouseDown={(e) => e.stopPropagation()} className="absolute -right-2 top-0 bottom-0 flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap">
                          <button onClick={() => setEditingNote(note)} className="text-xs font-bold text-current opacity-60 hover:opacity-100 hover:underline transition-all p-2">编辑</button>
                          <span className="text-[10px] opacity-30 select-none pb-0.5">/</span>
                          <form action={deleteNote}><input type="hidden" name="id" value={note.id} /><button className="text-xs font-bold text-red-900/60 hover:text-red-700 hover:underline transition-all p-2">撕下</button></form>
                      </div>
                      )}
                  </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAuthModal(false)}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">管理员登录</h3>
                <form action={handleLogin} className="space-y-4">
                    <div>
                      <input type="text" name="username" placeholder="用户名" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none mb-3" />
                      <input type="password" name="password" placeholder="密码" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none" />
                    </div>
                    {authError && <p className="text-xs text-red-400">{authError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg">确认</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Edit Modal (保持不变) */}
      {editingNote && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingNote(null)}>
            <div 
                className={`
                    p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 relative 
                    transition-colors duration-300
                    ${isPresetColor(editingNote.color || 'yellow') ? colorStyles[editingNote.color || 'yellow'] : 'text-slate-900'}
                `} 
                style={!isPresetColor(editingNote.color || 'yellow') ? { backgroundColor: editingNote.color } : {}}
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">{editingNote.id ? '✏️ 编辑' : '📌 新贴纸'}</h3>
                <form action={handleSubmitNote} className="space-y-4">
                    {editingNote.id && <input type="hidden" name="id" value={editingNote.id} />}
                    
                    <div className="flex gap-3 justify-center mb-4 p-2 bg-black/5 rounded-full w-fit mx-auto items-center">
                        {COLOR_OPTIONS.map(c => (
                            <label key={c} className="cursor-pointer relative group">
                                <input 
                                    type="radio" 
                                    name="color" 
                                    value={c} 
                                    checked={c === (editingNote.color || 'yellow')} 
                                    onChange={() => setEditingNote({...editingNote, color: c})} 
                                    className="peer sr-only" 
                                />
                                <div className={`w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-black/50 peer-checked:scale-110 transition-all ${colorStyles[c].split(' ')[0]}`}></div>
                            </label>
                        ))}
                        <div className="w-px h-4 bg-black/10 mx-1"></div>
                        <label className="cursor-pointer relative group flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 border-2 border-transparent hover:scale-110 transition-transform overflow-hidden">
                            <input 
                                type="color" 
                                name="color"
                                defaultValue={!isPresetColor(editingNote.color || '') ? editingNote.color : '#ffffff'}
                                onChange={(e) => setEditingNote({...editingNote, color: e.target.value})} 
                                className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer opacity-0" 
                            />
                            {!isPresetColor(editingNote.color || 'yellow') && (
                                <div className="absolute inset-0 rounded-full border-2 border-black/50 pointer-events-none"></div>
                            )}
                        </label>
                    </div>

                    <textarea name="content" defaultValue={editingNote.content} placeholder="写点什么..." className="w-full h-40 bg-white/40 border-none rounded-xl p-4 text-lg placeholder-black/30 focus:ring-0 resize-none font-handwriting" required />
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={() => setEditingNote(null)} className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded-lg text-sm font-medium transition">取消</button>
                        <button type="submit" className="px-6 py-2 bg-black/80 hover:bg-black text-white rounded-lg text-sm font-medium shadow-lg">保存</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
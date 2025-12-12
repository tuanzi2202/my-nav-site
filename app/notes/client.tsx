// app/notes/client.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createNote, updateNote, deleteNote, updateNotePosition, loginAdmin, updateNotesBgSettings } from '../actions'

// ... (类型定义 NoteItem, BgSettings 保持不变) ...
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

// 预设颜色样式 (Tailwind Classes)
const colorStyles: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 shadow-yellow-500/20 ring-yellow-400',
  pink:   'bg-pink-200 text-pink-900 shadow-pink-500/20 ring-pink-400',
  blue:   'bg-sky-200 text-sky-900 shadow-sky-500/20 ring-sky-400',
  green:  'bg-emerald-200 text-emerald-900 shadow-emerald-500/20 ring-emerald-400',
  purple: 'bg-purple-200 text-purple-900 shadow-purple-500/20 ring-purple-400',
}
const COLOR_OPTIONS = Object.keys(colorStyles)
const HEADER_HEIGHT = 140 

// ... (BG_PRESETS 保持不变) ...
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
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [isEditMode, setIsEditMode] = useState(false) 

  const [bgSettings, setBgSettings] = useState<BgSettings>(initialBgSettings || { type: 'color', value: '#0f172a' })
  const [showBgPanel, setShowBgPanel] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null)
  
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setNotes(initialNotes) }, [initialNotes])

  // ... (handleLogin, handleSaveBg, handleMouseDown, handleMouseMove, handleMouseUp 保持不变) ...
  const handleLogin = async (formData: FormData) => {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    
    // 调用更新后的服务端 Action
    const success = await loginAdmin(username, password)
    
    if (success) { 
      setIsAdmin(true); 
      setIsEditMode(false); 
      setShowAuthModal(false); 
      setAuthError('') 
    } else { 
      setAuthError('账号或密码错误') 
    }
  }

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

  // ... (getBackgroundStyle 保持不变) ...
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

  // ✨✨✨ 辅助函数：判断是否是预设颜色 ✨✨✨
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

      {/* ... (Header 保持不变，为了篇幅省略代码) ... */}
      <header className={`absolute top-0 left-0 w-full z-[9999] px-8 py-6 flex justify-between items-center h-[120px] transition-all duration-300 backdrop-blur-md ${isLightBg ? 'bg-white/30 text-slate-800 border-b border-white/20' : 'bg-black/20 text-white border-b border-white/5'}`}>
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-sm filter">Sticky Wall</h1>
          <p className={`text-xs mt-2 flex items-center gap-2 font-medium ${isLightBg ? 'text-slate-600' : 'text-slate-300/80'}`}>
            灵感碎片与备忘录 {isEditMode && <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-400/20 shadow-sm">[管理模式]</span>}
          </p>
        </div>
        <div className="flex gap-3 items-center">
            {isAdmin ? (
                <>
                    {isEditMode && (
                    <div className="relative">
                        <button onClick={() => setShowBgPanel(!showBgPanel)} className={`p-2 rounded-lg transition border backdrop-blur-sm ${showBgPanel ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-black/10 hover:bg-black/20 text-current border-transparent'}`} title="背景设置">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </button>
                        {showBgPanel && (
                            <div className="absolute top-12 right-0 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-4 animate-in zoom-in-95 origin-top-right text-slate-200 z-[10000]">
                                {/* ... (背景设置面板内容保持不变) ... */}
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
                    )}
                    {isEditMode && <div className={`w-px h-6 mx-1 ${isLightBg ? 'bg-slate-400/30' : 'bg-white/20'}`}></div>}
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 font-medium border backdrop-blur-sm ${isEditMode ? 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white' : isLightBg ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20 hover:bg-emerald-600/20' : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20'}`}>
                        {isEditMode ? '预览' : '管理'}
                    </button>
                    {isEditMode && (
                        <button onClick={() => setEditingNote({ color: 'yellow' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-500/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> 贴一张
                        </button>
                    )}
                </>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition text-sm backdrop-blur-sm border border-white/10">管理员登录</button>
            )}
            <a href="/" className={`px-4 py-2 rounded-lg transition text-sm backdrop-blur-sm ${isLightBg ? 'bg-black/5 hover:bg-black/10 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white'}`}>返回</a>
        </div>
      </header>

      <div className="w-full h-full relative z-10">
        {notes.map((note) => {
          const isDragging = draggingId === note.id
          const isHovered = isEditMode && hoveredId === note.id
          
          let dynamicZIndex = note.sortOrder
          if (isDragging) dynamicZIndex = 999999 
          else if (isHovered) dynamicZIndex = 999990

          // ✨✨✨ 1. 动态生成样式 ✨✨✨
          const isPreset = isPresetColor(note.color)
          
          // 如果是自定义颜色，应用通用样式 + 内联背景色
          const customStyle = !isPreset ? {
             backgroundColor: note.color,
             // 给自定义颜色便利贴一些默认的阴影和旋转效果，以匹配预设风格
          } : {}

          return (
            <div
              key={note.id}
              onMouseDown={(e) => handleMouseDown(e, note)}
              onMouseEnter={() => isEditMode && setHoveredId(note.id)}
              onMouseLeave={() => isEditMode && setHoveredId(null)}
              className={`
                group absolute flex flex-col p-6 w-[280px] min-h-[200px] rounded-sm
                
                /* ✨ 应用预设样式 或 通用样式 */
                ${isPreset 
                    ? colorStyles[note.color] 
                    : 'text-slate-900 shadow-xl ring-1 ring-black/5' /* 自定义颜色的通用基类 */
                }

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
                  ...customStyle // ✨ 应用自定义颜色
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

      {showAuthModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95" onMouseDown={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">管理员登录</h3>
                <form action={handleLogin} className="space-y-4">
                    {/* ✨ 新增：用户名输入框 */}
                    <div>
                      <input 
                        type="text" 
                        name="username" 
                        placeholder="用户名" 
                        autoFocus 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none mb-3" 
                      />
                      <input 
                        type="password" 
                        name="password" 
                        placeholder="密码" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none" 
                      />
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

      {editingNote && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            {/* ✨✨✨ 2. 编辑弹窗动态颜色 ✨✨✨ */}
            <div 
                className={`
                    p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 relative 
                    transition-colors duration-300
                    ${isPresetColor(editingNote.color || 'yellow') ? colorStyles[editingNote.color || 'yellow'] : 'text-slate-900'}
                `} 
                style={!isPresetColor(editingNote.color || 'yellow') ? { backgroundColor: editingNote.color } : {}}
                onMouseDown={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">{editingNote.id ? '✏️ 编辑' : '📌 新贴纸'}</h3>
                <form action={handleSubmitNote} className="space-y-4">
                    {editingNote.id && <input type="hidden" name="id" value={editingNote.id} />}
                    
                    {/* 颜色选择区 */}
                    <div className="flex gap-3 justify-center mb-4 p-2 bg-black/5 rounded-full w-fit mx-auto items-center">
                        {/* 预设颜色 */}
                        {COLOR_OPTIONS.map(c => (
                            <label key={c} className="cursor-pointer relative group">
                                <input 
                                    type="radio" 
                                    name="color" 
                                    value={c} 
                                    checked={c === (editingNote.color || 'yellow')} // ✅ 改为 checked，实现受控组件
                                    onChange={() => setEditingNote({...editingNote, color: c})} 
                                    className="peer sr-only" 
                                />
                                <div className={`w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-black/50 peer-checked:scale-110 transition-all ${colorStyles[c].split(' ')[0]}`}></div>
                            </label>
                        ))}
                        
                        <div className="w-px h-4 bg-black/10 mx-1"></div>

                        {/* ✨✨✨ 自定义颜色选择器 ✨✨✨ */}
                        <label className="cursor-pointer relative group flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-red-400 via-green-400 to-blue-400 border-2 border-transparent hover:scale-110 transition-transform overflow-hidden">
                            {/* 真实的 input[type=color] */}
                            <input 
                                type="color" 
                                name="color" // 提交时也是 name="color"
                                // 如果当前颜色不是预设的，则认为是自定义颜色，回填 value
                                defaultValue={!isPresetColor(editingNote.color || '') ? editingNote.color : '#ffffff'}
                                onChange={(e) => setEditingNote({...editingNote, color: e.target.value})} 
                                className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer opacity-0" 
                            />
                            {/* 选中指示器：如果当前是自定义颜色，显示一个黑色边框 */}
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
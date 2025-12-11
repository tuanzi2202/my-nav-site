// app/notes/client.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createNote, updateNote, deleteNote, updateNotePosition, loginAdmin } from '../actions'

type NoteItem = {
  id: number
  content: string
  color: string
  createdAt: Date
  sortOrder: number
  x: number
  y: number
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

export default function NotesWallClient({ initialNotes, initialIsAdmin }: { initialNotes: NoteItem[], initialIsAdmin: boolean }) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  
  // ✨✨✨ 状态分离：isAdmin 代表身份权限，isEditMode 代表当前界面模式 ✨✨✨
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  const [isEditMode, setIsEditMode] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null)
  
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setNotes(initialNotes) }, [initialNotes])

  const handleLogin = async (formData: FormData) => {
    const success = await loginAdmin(formData.get('password') as string)
    if (success) { 
        setIsAdmin(true); 
        setIsEditMode(false);
        setShowAuthModal(false); 
        setAuthError('') 
    } else { 
        setAuthError('密码错误') 
    }
  }

  // ✨ 将所有的 isAdmin 检查替换为 isEditMode 检查
  const handleMouseDown = (e: React.MouseEvent, note: NoteItem) => {
    if (!isEditMode) return // 只有在编辑模式下才能拖拽
    
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

      if (note) {
          await updateNotePosition(currentId, note.x, note.y, note.sortOrder)
      }
    }
  }

  const handleSubmitNote = async (formData: FormData) => {
    if (editingNote?.id) await updateNote(formData)
    else await createNote(formData)
    setEditingNote(null)
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header className="absolute top-0 left-0 w-full z-[9999] px-8 py-6 border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-sm flex justify-between items-center h-[120px]">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">Sticky Wall</h1>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            灵感碎片与备忘录 
            {/* ✨ 状态指示器只显示当前模式 */}
            {isEditMode && <span className="text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded">[管理模式: 可拖拽/编辑]</span>}
          </p>
        </div>
        <div className="flex gap-3">
            {isAdmin ? (
                <>
                    {/* ✨✨✨ 新增：模式切换按钮 ✨✨✨ */}
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`
                            px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 font-medium border
                            ${isEditMode 
                                ? 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white' 
                                : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}
                        `}
                    >
                        {isEditMode ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                切换至预览
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                切换至管理
                            </>
                        )}
                    </button>

                    {/* ✨ 只有在编辑模式下才显示“贴一张”按钮 */}
                    {isEditMode && (
                        <button onClick={() => setEditingNote({ color: 'yellow' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-sm flex items-center gap-2 shadow-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg> 贴一张
                        </button>
                    )}
                </>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-sm">管理员登录</button>
            )}
            <a href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm text-slate-300">返回</a>
        </div>
      </header>

      <div className="w-full h-full">
        {notes.map((note) => {
          const isDragging = draggingId === note.id
          // ✨ 使用 isEditMode 判断是否允许 hover 高亮
          const isHovered = isEditMode && hoveredId === note.id
          
          let dynamicZIndex = note.sortOrder
          if (isDragging) {
             dynamicZIndex = 999999 
          } else if (isHovered) {
             dynamicZIndex = 999990 
          }

          return (
            <div
              key={note.id}
              // ✨ 事件处理全部检查 isEditMode
              onMouseDown={(e) => handleMouseDown(e, note)}
              onMouseEnter={() => isEditMode && setHoveredId(note.id)}
              onMouseLeave={() => isEditMode && setHoveredId(null)}
              className={`
                group absolute flex flex-col p-6 w-[280px] min-h-[200px] shadow-xl rounded-sm
                ${colorStyles[note.color] || colorStyles.yellow}
                
                border border-black/50

                /* ✨ 根据模式切换光标样式和动画 */
                ${isEditMode 
                  ? 'cursor-grab active:cursor-grabbing' 
                  : 'animate-note-sway hover:[animation-play-state:paused]'}
                
                hover:ring-2 hover:ring-offset-2 hover:ring-offset-[#0f172a] 
                hover:scale-[1.02] hover:shadow-2xl
                
                transition duration-200 select-none
                ${isDragging ? 'duration-0 transition-none' : ''}
              `}
              style={{
                  left: note.x,
                  top: note.y,
                  zIndex: dynamicZIndex,
                  // ✨ 只有在非编辑模式下才播放摆动动画
                  animationDuration: !isEditMode ? `${6 + (note.id % 5)}s` : '0s',
                  animationDelay: !isEditMode ? `${-(note.id % 5)}s` : '0s',
                  transform: isDragging ? 'scale(1.05)' : undefined,
              }}
            >
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner z-10 pointer-events-none"></div>
              <div className="absolute top-[-8px] left-[calc(50%-2px)] w-1.5 h-1.5 rounded-full bg-white/30 z-20 pointer-events-none"></div>

              <div 
                className="
                    flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting 
                    overflow-y-auto max-h-[240px] pr-2
                    pointer-events-auto
                    note-scrollbar
                    select-text cursor-default
                "
              >
                {note.content}
              </div>
              
              <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center h-8 relative">
                  <span className="opacity-60 text-xs font-mono pointer-events-none text-current">
                      {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="relative min-w-[60px] flex justify-end">
                      {/* ✨ 在编辑模式下隐藏 ID，显示操作按钮；预览模式下显示 ID */}
                      <span className={`font-bold opacity-40 text-xs font-mono transition-opacity duration-300 pointer-events-none ${isEditMode ? 'group-hover:opacity-0' : ''}`}>
                          #{note.id}
                      </span>
                      
                      {/* ✨ 操作按钮仅在 isEditMode 下显示 */}
                      {isEditMode && (
                      <div 
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute -right-2 top-0 bottom-0 flex items-center justify-end gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap"
                      >
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
                <h3 className="text-lg font-bold text-white mb-4">管理员验证</h3>
                <form action={handleLogin} className="space-y-4">
                    <input type="password" name="password" placeholder="输入管理员密码..." autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none" />
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
            <div className={`p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 relative ${colorStyles[editingNote.color || 'yellow'].split(' ')[0]} ${colorStyles[editingNote.color || 'yellow'].split(' ')[1]}`} onMouseDown={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">{editingNote.id ? '✏️ 编辑' : '📌 新贴纸'}</h3>
                <form action={handleSubmitNote} className="space-y-4">
                    {editingNote.id && <input type="hidden" name="id" value={editingNote.id} />}
                    <div className="flex gap-3 justify-center mb-4 p-2 bg-black/5 rounded-full w-fit mx-auto">
                        {COLOR_OPTIONS.map(c => (
                            <label key={c} className="cursor-pointer relative">
                                <input type="radio" name="color" value={c} defaultChecked={c === (editingNote.color || 'yellow')} onChange={() => setEditingNote({...editingNote, color: c})} className="peer sr-only" />
                                <div className={`w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-black/50 peer-checked:scale-110 transition-all ${colorStyles[c].split(' ')[0]}`}></div>
                            </label>
                        ))}
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
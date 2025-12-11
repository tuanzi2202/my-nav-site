'use client'

import { useState, useRef, useEffect } from 'react'
import { createNote, updateNote, deleteNote, updateNotePosition, verifyAdminPassword } from '../actions'

// 类型定义更新
type NoteItem = {
  id: number
  content: string
  color: string
  createdAt: Date
  sortOrder: number // 用作 z-index
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

// ✨ 定义顶部菜单的安全高度 (像素)
const HEADER_HEIGHT = 140 

export default function NotesWallClient({ initialNotes }: { initialNotes: NoteItem[] }) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null)

  // ✨ 拖拽状态管理
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 }) // 鼠标相对于便利贴左上角的偏移
  const containerRef = useRef<HTMLDivElement>(null) // 墙壁容器

  useEffect(() => { setNotes(initialNotes) }, [initialNotes])

  // --- 鉴权 ---
  const handleLogin = async (formData: FormData) => {
    const isValid = await verifyAdminPassword(formData.get('password') as string)
    if (isValid) { setIsAdmin(true); setShowAuthModal(false); setAuthError('') } 
    else { setAuthError('密码错误') }
  }

  // --- ✨ 自由拖拽核心逻辑 (Mouse Events) ---
  const handleMouseDown = (e: React.MouseEvent, note: NoteItem) => {
    if (!isAdmin) return
    e.stopPropagation() // 防止触发其他点击事件
    
    // 1. 记录正在拖拽的 ID
    setDraggingId(note.id)
    
    // 2. 计算鼠标点击位置相对于便利贴左上角的偏移量
    // 这样拖拽时便利贴不会瞬间“跳”到鼠标中心
    dragOffset.current = {
      x: e.clientX - note.x,
      y: e.clientY - note.y
    }

    // 3. 点击时“置顶” (本地乐观更新 z-index)
    const maxZ = Math.max(...notes.map(n => n.sortOrder)) + 1
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, sortOrder: maxZ } : n))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return
    e.preventDefault()

    // 计算新坐标
    let newX = e.clientX - dragOffset.current.x
    let newY = e.clientY - dragOffset.current.y

    // ✨ 边界限制：不能拖到顶部菜单 (HEADER_HEIGHT) 之上
    if (newY < HEADER_HEIGHT) newY = HEADER_HEIGHT
    // 可选：防止拖出左边界
    if (newX < 0) newX = 0

    // 更新本地状态实现流畅跟随
    setNotes(prev => prev.map(n => 
      n.id === draggingId ? { ...n, x: newX, y: newY } : n
    ))
  }

  const handleMouseUp = async () => {
    if (draggingId !== null) {
      // 拖拽结束，保存最终位置到数据库
      const note = notes.find(n => n.id === draggingId)
      if (note) {
        await updateNotePosition(note.id, note.x, note.y)
      }
      setDraggingId(null)
    }
  }

  // CRUD 包装
  const handleSubmitNote = async (formData: FormData) => {
    if (editingNote?.id) await updateNote(formData)
    else await createNote(formData)
    setEditingNote(null)
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden" // 确保容器填满且隐藏滚动条(可选)
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // 鼠标离开窗口也视为松开
    >
      {/* 顶部菜单 (固定高度) */}
      <header className="absolute top-0 left-0 w-full z-[9999] px-8 py-6 border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-sm flex justify-between items-center h-[120px]">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
            Sticky Wall
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            灵感碎片与备忘录 {isAdmin && <span className="text-emerald-400 font-bold ml-2">[管理模式: 可自由拖拽]</span>}
          </p>
        </div>
        <div className="flex gap-3">
            {isAdmin ? (
                <button onClick={() => setEditingNote({ color: 'yellow' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-sm flex items-center gap-2 shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    贴一张
                </button>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-sm">
                    管理员登录
                </button>
            )}
            <a href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm text-slate-300">返回</a>
        </div>
      </header>

      {/* --- 便利贴画布区域 --- */}
      <div className="w-full h-full">
        {notes.map((note) => (
          <div
            key={note.id}
            onMouseDown={(e) => handleMouseDown(e, note)}
            className={`
              absolute flex flex-col p-6 w-[280px] min-h-[200px] shadow-xl rounded-sm
              ${colorStyles[note.color] || colorStyles.yellow}
              ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:ring-2 ring-offset-2 ring-offset-[#0f172a]' : 'animate-note-sway hover:[animation-play-state:paused]'}
              transition-shadow duration-200 select-none
            `}
            style={{
                left: note.x,
                top: note.y,
                zIndex: note.sortOrder, // 使用 sortOrder 作为 z-index
                // 只有非管理模式才有摆动动画，避免拖拽时抖动
                animationDuration: !isAdmin ? `${6 + (note.id % 5)}s` : '0s',
                animationDelay: !isAdmin ? `${-(note.id % 5)}s` : '0s',
                transform: draggingId === note.id ? 'scale(1.05)' : 'scale(1)', // 拖拽时轻微放大
            }}
          >
            {/* 钉子视觉 */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner z-10 pointer-events-none"></div>
            <div className="absolute top-[-8px] left-[calc(50%-2px)] w-1.5 h-1.5 rounded-full bg-white/30 z-20 pointer-events-none"></div>

            {/* 管理按钮 */}
            {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={() => setEditingNote(note)} className="p-1.5 bg-white/20 hover:bg-white/40 rounded text-black/70 hover:text-black">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <form action={deleteNote}>
                        <input type="hidden" name="id" value={note.id} />
                        <button className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded text-red-800 hover:text-red-900">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </form>
                </div>
            )}

            <div className="flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting pointer-events-none">
              {note.content}
            </div>
            
            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center opacity-60 text-xs font-mono pointer-events-none">
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              <span className="font-bold opacity-80">#{note.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 弹窗部分保持不变 (Login Modal & Edit Modal) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
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
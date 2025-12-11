'use client'

import { useState, useRef, useEffect } from 'react'
import { createNote, updateNote, deleteNote, reorderNotes, verifyAdminPassword } from '../actions'

type NoteItem = {
  id: number
  content: string
  color: string
  createdAt: Date
  sortOrder: number
}

const colorStyles: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 shadow-yellow-500/20 ring-yellow-400',
  pink:   'bg-pink-200 text-pink-900 shadow-pink-500/20 ring-pink-400',
  blue:   'bg-sky-200 text-sky-900 shadow-sky-500/20 ring-sky-400',
  green:  'bg-emerald-200 text-emerald-900 shadow-emerald-500/20 ring-emerald-400',
  purple: 'bg-purple-200 text-purple-900 shadow-purple-500/20 ring-purple-400',
}

const COLOR_OPTIONS = Object.keys(colorStyles)

export default function NotesWallClient({ initialNotes }: { initialNotes: NoteItem[] }) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  
  // 编辑/新增状态
  const [editingNote, setEditingNote] = useState<Partial<NoteItem> | null>(null)
  
  // 拖拽状态
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const dragOverItemIndex = useRef<number | null>(null)

  // 同步 Server Data
  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  // --- 鉴权逻辑 ---
  const handleLogin = async (formData: FormData) => {
    const pwd = formData.get('password') as string
    const isValid = await verifyAdminPassword(pwd)
    if (isValid) {
      setIsAdmin(true)
      setShowAuthModal(false)
      setAuthError('')
    } else {
      setAuthError('密码错误，请重试')
    }
  }

  // --- 拖拽逻辑 ---
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index)
    dragOverItemIndex.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItemIndex.current = index
  }

  const handleDragEnd = async () => {
    const dragIndex = draggedItemIndex
    const dropIndex = dragOverItemIndex.current

    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDraggedItemIndex(null)
      return
    }

    // 乐观更新 UI
    const newNotes = [...notes]
    const draggedItem = newNotes[dragIndex]
    newNotes.splice(dragIndex, 1)
    newNotes.splice(dropIndex, 0, draggedItem)
    setNotes(newNotes)
    setDraggedItemIndex(null)

    // 计算新的 sortOrder 并提交服务器
    // 简单的策略：反转索引 * 10，确保顺序
    const len = newNotes.length
    const updates = newNotes.map((note, idx) => ({
      id: note.id,
      sortOrder: (len - idx) * 10
    }))
    
    await reorderNotes(updates)
  }

  // --- CRUD 包装 ---
  const handleSubmitNote = async (formData: FormData) => {
    if (editingNote?.id) {
        await updateNote(formData)
    } else {
        await createNote(formData)
    }
    setEditingNote(null)
  }

  return (
    <>
      <header className="mb-12 flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
            Sticky Wall
          </h1>
          <p className="text-xs text-slate-500 mt-2">灵感碎片与备忘录 {isAdmin && <span className="text-emerald-400 font-bold ml-2">[管理模式已开启]</span>}</p>
        </div>
        <div className="flex gap-3">
            {isAdmin ? (
                <button onClick={() => setEditingNote({ color: 'yellow' })} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    贴一张
                </button>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-sm">
                    管理员登录
                </button>
            )}
            <a href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm text-slate-300">
                ← 返回
            </a>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 auto-rows-max px-4 pb-20">
        {notes.map((note, index) => (
          <div
            key={note.id}
            draggable={isAdmin}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`
              relative p-6 min-h-[200px] flex flex-col shadow-xl rounded-sm
              ${colorStyles[note.color] || colorStyles.yellow}
              ${!isAdmin ? 'animate-note-sway hover:[animation-play-state:paused]' : 'cursor-move hover:ring-2 ring-offset-2 ring-offset-[#0f172a] transform hover:-translate-y-1'} 
              transition-all duration-300 select-none
              ${draggedItemIndex === index ? 'opacity-50 scale-95 border-2 border-dashed border-white' : ''}
            `}
            style={{
                // 如果不是管理员模式，给个随机动画延迟让摆动更自然
                animationDuration: !isAdmin ? `${6 + (note.id % 5)}s` : '0s',
                animationDelay: !isAdmin ? `${-(note.id % 5)}s` : '0s',
                rotate: isAdmin ? '0deg' : undefined
            }}
          >
            {/* 钉子效果 */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner z-10"></div>
            <div className="absolute top-[-8px] left-[calc(50%-2px)] w-1.5 h-1.5 rounded-full bg-white/30 z-20"></div>

            {/* 管理按钮组 */}
            {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div className="flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting">
              {note.content}
            </div>
            
            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center opacity-60 text-xs font-mono">
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              {isAdmin && <span>#{note.sortOrder}</span>}
            </div>
          </div>
        ))}

        {notes.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <p className="text-slate-500">墙上空空如也{isAdmin ? '，点击上方按钮添加' : '，登录管理员来贴一张吧'}</p>
            </div>
        )}
      </div>

      {/* --- 登录弹窗 --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-4">管理员验证</h3>
                <form action={handleLogin} className="space-y-4">
                    <input 
                        type="password" 
                        name="password" 
                        placeholder="输入管理员密码..." 
                        autoFocus
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none"
                    />
                    {authError && <p className="text-xs text-red-400">{authError}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg">确认</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- 编辑/新增弹窗 --- */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className={`
                p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 relative
                ${colorStyles[editingNote.color || 'yellow'].split(' ')[0]} 
                ${colorStyles[editingNote.color || 'yellow'].split(' ')[1]}
            `}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    {editingNote.id ? '✏️ 编辑内容' : '📌 新便利贴'}
                </h3>
                
                <form action={handleSubmitNote} className="space-y-4">
                    {editingNote.id && <input type="hidden" name="id" value={editingNote.id} />}
                    
                    {/* 颜色选择器 */}
                    <div className="flex gap-3 justify-center mb-4 p-2 bg-black/5 rounded-full w-fit mx-auto">
                        {COLOR_OPTIONS.map(c => (
                            <label key={c} className="cursor-pointer relative">
                                <input 
                                    type="radio" 
                                    name="color" 
                                    value={c} 
                                    defaultChecked={c === (editingNote.color || 'yellow')}
                                    onChange={() => setEditingNote({...editingNote, color: c})}
                                    className="peer sr-only"
                                />
                                <div className={`w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-black/50 peer-checked:scale-110 transition-all ${colorStyles[c].split(' ')[0]}`}></div>
                            </label>
                        ))}
                    </div>

                    <textarea 
                        name="content" 
                        defaultValue={editingNote.content}
                        placeholder="写下你的想法..." 
                        className="w-full h-40 bg-white/40 border-none rounded-xl p-4 text-lg placeholder-black/30 focus:ring-0 resize-none font-handwriting"
                        required
                    />
                    
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={() => setEditingNote(null)} className="px-4 py-2 bg-black/10 hover:bg-black/20 rounded-lg text-sm font-medium transition">取消</button>
                        <button type="submit" className="px-6 py-2 bg-black/80 hover:bg-black text-white rounded-lg text-sm font-medium shadow-lg transition transform active:scale-95">保存</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  )
}
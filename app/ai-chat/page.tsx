// app/ai-chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  getAICharacters, createAICharacter, updateAICharacter, deleteAICharacter, getAdminStatus,
  getChatSessions, createChatSession, deleteChatSession,
  getSessionMessages, saveUserMessage, triggerAIReply, chatWithAIStateless 
} from '../ai-actions'
import { useRouter } from 'next/navigation'

// --- 1. 打字机组件 (Typewriter) ---
const Typewriter = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    // 重置状态
    indexRef.current = 0
    setDisplayedText('')

    const intervalId = setInterval(() => {
      indexRef.current++
      setDisplayedText(text.slice(0, indexRef.current))

      // 打字完成
      if (indexRef.current >= text.length) {
        clearInterval(intervalId)
        onComplete() // 通知父组件：这一条打完了，请显示下一条
      }
    }, 30) // 打字速度：30ms/字 (可微调)

    return () => clearInterval(intervalId)
  }, [text, onComplete])

  return (
    <span>
      {displayedText}
      <span className="inline-block w-1.5 h-4 ml-0.5 bg-current align-middle animate-pulse" />
    </span>
  )
}

export default function AIChatPage() {
  const router = useRouter()
  
  // --- State ---
  const [isAdmin, setIsAdmin] = useState(false)
  const [dbCharacters, setDbCharacters] = useState<any[]>([])
  const [dbSessions, setDbSessions] = useState<any[]>([])
  
  const [localCharacters, setLocalCharacters] = useState<any[]>([])
  const [localSessions, setLocalSessions] = useState<any[]>([])

  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  
  // ✨✨✨ 打字机指针：控制当前显示到第几条消息
  const [typingIndex, setTypingIndex] = useState(0)

  // UI
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCharModal, setShowCharModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [currentThinkingAI, setCurrentThinkingAI] = useState<string>('') 
  
  // 编辑状态
  const [editingCharId, setEditingCharId] = useState<string | number | null>(null)
  const [charForm, setCharForm] = useState({ name: '', prompt: '', avatar: '', desc: '', isPublic: false })
  
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]) 

  const scrollRef = useRef<HTMLDivElement>(null)

  // --- Initialization ---
  useEffect(() => {
    getAdminStatus().then(status => {
        setIsAdmin(status)
        refreshDbData()
    })

    const savedChars = localStorage.getItem('local_ai_characters')
    if (savedChars) setLocalCharacters(JSON.parse(savedChars))
    
    const savedSessions = localStorage.getItem('local_ai_sessions')
    if (savedSessions) setLocalSessions(JSON.parse(savedSessions))
  }, [])

  useEffect(() => { localStorage.setItem('local_ai_characters', JSON.stringify(localCharacters)) }, [localCharacters])
  useEffect(() => { localStorage.setItem('local_ai_sessions', JSON.stringify(localSessions)) }, [localSessions])

  const refreshDbData = async () => {
    const [c, s] = await Promise.all([getAICharacters(), getChatSessions()])
    setDbCharacters(c)
    setDbSessions(s)
  }

  // ✨✨✨ 切换会话时，重置消息并跳过打字效果（历史消息直接显示）
  useEffect(() => {
    if (!activeSession) return
    
    if (typeof activeSession.id === 'number') {
       getSessionMessages(activeSession.id).then(msgs => {
         setMessages(msgs)
         setTypingIndex(msgs.length) // 指针指到最后，表示全部已读
       })
    } else {
       setMessages(activeSession.messages || [])
       setTypingIndex((activeSession.messages || []).length)
    }
  }, [activeSession?.id])

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, currentThinkingAI, typingIndex])

  const displayCharacters = isAdmin ? dbCharacters : [...dbCharacters, ...localCharacters]
  const displaySessions = isAdmin ? dbSessions : localSessions

  // --- Actions ---

  const openCreateModal = () => {
      setEditingCharId(null)
      setCharForm({ name: '', prompt: '', avatar: '', desc: '', isPublic: false })
      setShowCharModal(true)
  }

  const openEditModal = (char: any) => {
      setEditingCharId(char.id)
      setCharForm({
          name: char.name,
          prompt: char.systemPrompt,
          desc: char.description || '',
          avatar: char.avatar || '',
          isPublic: char.isPublic || false
      })
      setShowCharModal(true)
  }

  const handleSaveChar = async () => {
    if (!charForm.name || !charForm.prompt) return alert("请填写名称和提示词")
    const avatarUrl = charForm.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${charForm.name}`

    if (isAdmin) {
        const fd = new FormData()
        fd.append('name', charForm.name)
        fd.append('systemPrompt', charForm.prompt)
        fd.append('description', charForm.desc)
        fd.append('avatar', avatarUrl)
        if (charForm.isPublic) fd.append('isPublic', 'on')

        if (editingCharId && typeof editingCharId === 'number') {
            fd.append('id', String(editingCharId))
            await updateAICharacter(fd)
        } else {
            await createAICharacter(fd)
        }
        refreshDbData()
    } else {
        if (editingCharId && typeof editingCharId === 'string') {
            setLocalCharacters(prev => prev.map(c => c.id === editingCharId ? { ...c, name: charForm.name, systemPrompt: charForm.prompt, description: charForm.desc, avatar: avatarUrl } : c))
        } else {
            setLocalCharacters(prev => [{ id: `local_char_${Date.now()}`, name: charForm.name, systemPrompt: charForm.prompt, description: charForm.desc, avatar: avatarUrl, createdAt: new Date() }, ...prev])
        }
    }
    setShowCharModal(false)
  }

  const handleDeleteChar = async (id: number | string) => {
      if (typeof id === 'number') {
          if (!isAdmin) return alert("无法删除云端公开角色")
          if (!confirm("确定要永久删除这个角色吗？")) return
          await deleteAICharacter(id)
          refreshDbData()
      } else {
          setLocalCharacters(prev => prev.filter(c => c.id !== id))
      }
  }

  const handleCreateSession = async () => {
    if (!newSessionName || selectedCharIds.length === 0) return alert("请填写完整")
    
    if (isAdmin) {
        const dbIds = selectedCharIds.map(id => parseInt(id)).filter(id => !isNaN(id))
        if (dbIds.length !== selectedCharIds.length) return alert("云端会话不能包含本地角色")
        const session = await createChatSession(newSessionName, dbIds)
        refreshDbData()
        setActiveSession(session)
    } else {
        const selectedChars = displayCharacters.filter(c => selectedCharIds.includes(String(c.id)))
        const newSession = {
            id: `session_${Date.now()}`,
            name: newSessionName,
            participants: selectedChars, 
            messages: [],
            updatedAt: new Date()
        }
        setLocalSessions(prev => [newSession, ...prev])
        setActiveSession(newSession)
    }
    setShowSessionModal(false)
  }

  const handleDeleteSession = async (e: React.MouseEvent, id: number | string) => {
    e.stopPropagation() 
    if (!confirm("确定要删除这个群聊吗？")) return
    if (isAdmin && typeof id === 'number') {
        try { await deleteChatSession(id); refreshDbData() } catch (err) { alert("删除失败") }
    } else if (!isAdmin && typeof id === 'string') {
        setLocalSessions(prev => prev.filter(s => s.id !== id))
    }
    if (activeSession?.id === id) setActiveSession(null)
  }

  // ✨✨✨ 发送消息逻辑 (确保打字机队列正常工作)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || isProcessing || !activeSession) return
    const content = inputMsg; setInputMsg(''); setIsProcessing(true)

    // 1. 用户消息：直接上屏 (typingIndex + 1)
    const userMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTypingIndex(prev => prev + 1) 

    // 持久化
    if (typeof activeSession.id === 'number') await saveUserMessage(activeSession.id, content)
    else updateLocalSessionMessages(activeSession.id, userMsg)

    // 2. AI 轮流回复
    const participants = activeSession.participants || []
    let currentHistory = [...messages, userMsg] 

    for (const char of participants) {
        setCurrentThinkingAI(char.name)
        // 模拟思考时间
        await new Promise(r => setTimeout(r, 800))
        
        let res;
        if (typeof activeSession.id === 'number') {
            res = await triggerAIReply(activeSession.id, char.id)
        } else {
            const historyPayload = currentHistory.map(m => {
                let prefix = "User"; if (m.role !== 'user') prefix = m.character?.name || m.name || "Assistant"
                return { role: m.role, content: `${prefix}: ${m.content}` }
            })
            const allNames = ['User', ...participants.map((p: any) => p.name)]
            res = await chatWithAIStateless({
                character: { name: char.name, systemPrompt: char.systemPrompt },
                history: historyPayload, participantsNames: allNames
            })
            if (res.success && res.message) res.message.character = char 
        }

        if (res.success && res.message) {
            // ✨ 关键：AI 消息只是加入数组，typingIndex 不变
            // 界面会自动检测到 (idx > typingIndex)，从而触发 Typewriter 组件
            setMessages(prev => [...prev, res.message])
            currentHistory.push(res.message) 
            
            if (typeof activeSession.id !== 'number') updateLocalSessionMessages(activeSession.id, res.message)
        }
    }
    setCurrentThinkingAI(''); setIsProcessing(false)
  }

  const updateLocalSessionMessages = (sessionId: string, newMsg: any) => {
      setLocalSessions(prev => prev.map(s => {
          if (s.id === sessionId) return { ...s, messages: [...(s.messages || []), newMsg], updatedAt: new Date() }
          return s
      }))
      setActiveSession((prev: any) => {
          if (prev?.id === sessionId) return { ...prev, messages: [...(prev.messages || []), newMsg] }
          return prev
      })
  }
  
  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* 侧边栏 */}
      <div className="w-64 bg-slate-900/80 border-r border-slate-700/50 flex flex-col backdrop-blur-md">
        <div className="p-4 border-b border-slate-800/50">
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-lg">AI Group Chat</h1>
            <div className={`text-[10px] mb-2 font-medium ${isAdmin ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isAdmin ? '⚡ 云端控制台 (管理员)' : '🌱 本地体验版 (游客)'}
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowSessionModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-xs py-2 rounded text-white transition">+ 新群聊</button>
                <button onClick={openCreateModal} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 transition">角色管理</button>
            </div>
        </div>
        
        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {displaySessions.map(s => (
                <div key={s.id} className="group relative">
                    <button onClick={() => setActiveSession(s)} className={`w-full text-left p-3 pr-9 rounded-xl transition flex items-center gap-3 ${activeSession?.id === s.id ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'hover:bg-slate-800/50 text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>{s.name[0]}</div>
                        <div className="overflow-hidden"><div className="font-medium text-sm truncate">{s.name}</div><div className="text-[10px] opacity-60 truncate">{s.participants?.length || 0} 位成员</div></div>
                    </button>
                    <button onClick={(e) => handleDeleteSession(e, s.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md hover:bg-slate-700/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            ))}
        </div>
        <div className="p-4 border-t border-slate-800/50"><button onClick={() => router.push('/')} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">← 返回导航站</button></div>
      </div>

      {/* 主界面 */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
         {activeSession ? (
            <>
                <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-sm z-10">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">{activeSession.name}<span className={`text-[10px] px-1.5 py-0.5 rounded border ${isAdmin ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{isAdmin ? 'Cloud' : 'Local'}</span></h2>
                        <div className="flex -space-x-2 mt-1">{activeSession.participants?.map((p: any) => (<img key={p.id} src={p.avatar} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 object-cover" />))}</div>
                    </div>
                </header>
                
                {/* 消息列表区域 (包含打字机逻辑) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg, idx) => {
                        // 1. 如果这条消息还没轮到 (idx > typingIndex)，则隐藏
                        if (idx > typingIndex) return null;
                        
                        // 2. 判断是否是“正在打字”的那条消息
                        const isUser = msg.role === 'user';
                        // 用户消息不用打字；AI 消息如果正好轮到指针位置，则触发打字
                        const isTyping = idx === typingIndex && !isUser;
                        
                        return (
                            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isUser && (<div className="flex flex-col items-center gap-1"><img src={msg.character?.avatar} className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700" /><span className="text-[10px] text-slate-500 max-w-[60px] truncate">{msg.character?.name}</span></div>)}
                                <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                    {isTyping ? (
                                        // ✨ 只有轮到它时，才渲染 Typewriter
                                        <Typewriter text={msg.content} onComplete={() => setTypingIndex(prev => prev + 1)} />
                                    ) : (
                                        // 否则直接渲染文本 (包含历史消息 和 已经打完的AI消息)
                                        msg.content
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {currentThinkingAI && <div className="flex gap-4 animate-pulse opacity-70"><div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div></div><span className="text-[10px] text-slate-500 mt-2">{currentThinkingAI} 正在思考...</span></div>}
                </div>

                <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} disabled={isProcessing} placeholder={isProcessing ? "讨论中..." : "输入消息..."} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition" />
                        <button type="submit" disabled={!inputMsg.trim() || isProcessing} className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                    </form>
                </div>
            </>
         ) : <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4"><div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center"><svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div><p>请在左侧选择或创建一个群聊</p></div>}
      </div>

      {/* 角色管理 Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                 <h3 className="text-lg font-bold text-white mb-4">
                     {editingCharId ? '编辑角色' : '创建角色'} <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : (editingCharId && typeof editingCharId === 'number' ? '云端·只读' : '本地')})</span>
                 </h3>
                 <div className="space-y-4 overflow-y-auto custom-scrollbar p-1">
                    <input placeholder="角色名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.name} onChange={e => setCharForm({...charForm, name: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <input placeholder="简短描述" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.desc} onChange={e => setCharForm({...charForm, desc: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <textarea placeholder="系统提示词..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-24" value={charForm.prompt} onChange={e => setCharForm({...charForm, prompt: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <input placeholder="头像 URL (可选)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.avatar} onChange={e => setCharForm({...charForm, avatar: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    {isAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-800">
                            <input type="checkbox" checked={charForm.isPublic} onChange={e => setCharForm({...charForm, isPublic: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-300">设为公开角色 (游客可见)</span>
                        </label>
                    )}
                </div>
                 <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                    <button onClick={() => setShowCharModal(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button>
                    {!( !isAdmin && typeof editingCharId === 'number' ) && (
                        <button onClick={handleSaveChar} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm shadow-lg shadow-emerald-500/20">
                            {editingCharId ? '保存修改' : '创建角色'}
                        </button>
                    )}
                 </div>
                 {!editingCharId && (
                     <div className="mt-4 pt-4 border-t border-slate-800 flex-1 overflow-y-auto custom-scrollbar min-h-[150px]">
                        <p className="text-xs text-slate-500 mb-2">已有角色 (点击编辑)</p>
                        {displayCharacters.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded group">
                                <span className="text-xs text-slate-300 flex items-center gap-2">
                                    <img src={c.avatar} className="w-5 h-5 rounded-full bg-slate-700" />
                                    {c.name}
                                    {typeof c.id === 'number' && c.isPublic && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">公开</span>}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(isAdmin || typeof c.id !== 'number') && <button onClick={() => openEditModal(c)} className="text-xs text-sky-400 hover:text-sky-300">编辑</button>}
                                    {(isAdmin || typeof c.id !== 'number') && <button onClick={() => handleDeleteChar(c.id)} className="text-xs text-slate-600 hover:text-red-400">删除</button>}
                                </div>
                            </div>
                        ))}
                     </div>
                 )}
             </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-4">创建新群聊 <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : '本地'})</span></h3>
                  <div className="space-y-4">
                        <input placeholder="群聊名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                        <p className="text-xs text-slate-500">选择参与角色</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {displayCharacters.map(c => (
                                <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(String(c.id)) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                    <input type="checkbox" className="hidden" checked={selectedCharIds.includes(String(c.id))} onChange={e => { const sid = String(c.id); if(e.target.checked) setSelectedCharIds([...selectedCharIds, sid]); else setSelectedCharIds(selectedCharIds.filter(id => id !== sid)) }} />
                                    <img src={c.avatar} className="w-6 h-6 rounded-full" />
                                    <div className="overflow-hidden"><div className="text-xs text-slate-200 truncate">{c.name}</div>{typeof c.id === 'number' && <div className="text-[9px] text-blue-400">Cloud</div>}</div>
                                </label>
                            ))}
                        </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button>
                      <button onClick={handleCreateSession} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm shadow-lg shadow-indigo-500/20">开始群聊</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
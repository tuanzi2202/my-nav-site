// app/ai-chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  getAICharacters, createAICharacter, deleteAICharacter, getAdminStatus,
  getChatSessions, createChatSession, deleteChatSession, // 👈 确保引入了 deleteChatSession
  getSessionMessages, saveUserMessage, triggerAIReply, chatWithAIStateless 
} from '../ai-actions'
import { useRouter } from 'next/navigation'

// --- 打字机组件 (保持不变) ---
const Typewriter = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)
  useEffect(() => {
    indexRef.current = 0; setDisplayedText('')
    const intervalId = setInterval(() => {
      indexRef.current++
      setDisplayedText(text.slice(0, indexRef.current))
      if (indexRef.current >= text.length) { clearInterval(intervalId); onComplete() }
    }, 50)
    return () => clearInterval(intervalId)
  }, [text, onComplete])
  return <span>{displayedText}<span className="inline-block w-1.5 h-4 ml-0.5 bg-current align-middle animate-pulse" /></span>
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
  const [typingIndex, setTypingIndex] = useState(0)

  // UI State
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCharModal, setShowCharModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [currentThinkingAI, setCurrentThinkingAI] = useState<string>('') 
  const [newChar, setNewChar] = useState({ name: '', prompt: '', avatar: '', desc: '' })
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]) 

  const scrollRef = useRef<HTMLDivElement>(null)

  // --- Initialization ---
  useEffect(() => {
    // 1. 检查权限并加载 DB 数据
    getAdminStatus().then(status => {
        setIsAdmin(status)
        if (status) {
            refreshDbData()
        }
    })

    // 2. 始终加载本地数据 (游客需要用)
    const savedChars = localStorage.getItem('local_ai_characters')
    if (savedChars) setLocalCharacters(JSON.parse(savedChars))
    
    const savedSessions = localStorage.getItem('local_ai_sessions')
    if (savedSessions) setLocalSessions(JSON.parse(savedSessions))
  }, [])

  // 监听本地数据变化并自动保存
  useEffect(() => { localStorage.setItem('local_ai_characters', JSON.stringify(localCharacters)) }, [localCharacters])
  useEffect(() => { localStorage.setItem('local_ai_sessions', JSON.stringify(localSessions)) }, [localSessions])

  const refreshDbData = async () => {
    const [c, s] = await Promise.all([getAICharacters(), getChatSessions()])
    setDbCharacters(c)
    setDbSessions(s)
  }

  // 切换会话
  useEffect(() => {
    if (!activeSession) return
    
    // DB 会话 (ID 是数字)
    if (typeof activeSession.id === 'number') {
       getSessionMessages(activeSession.id).then(msgs => {
         setMessages(msgs)
         setTypingIndex(msgs.length) // 历史消息无需打字
       })
    } else {
       // 本地会话
       setMessages(activeSession.messages || [])
       setTypingIndex((activeSession.messages || []).length)
    }
  }, [activeSession]) 

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, currentThinkingAI, typingIndex])

  // ✨✨✨ 核心修改：数据源彻底隔离 ✨✨✨
  // 如果是管理员，只看 DB 数据；如果是游客，只看 Local 数据
  const displayCharacters = isAdmin ? dbCharacters : localCharacters
  const displaySessions = isAdmin ? dbSessions : localSessions

  // --- Actions ---

  // 1. 创建角色 (隔离)
  const handleCreateChar = async () => {
    if (isAdmin) {
        // Admin -> DB
        const fd = new FormData()
        fd.append('name', newChar.name); fd.append('systemPrompt', newChar.prompt); 
        fd.append('description', newChar.desc); fd.append('avatar', newChar.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${newChar.name}`)
        await createAICharacter(fd)
        refreshDbData()
    } else {
        // Guest -> Local
        const newLocalChar = {
            id: `local_char_${Date.now()}`, 
            name: newChar.name,
            systemPrompt: newChar.prompt,
            description: newChar.desc,
            avatar: newChar.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${newChar.name}`,
            createdAt: new Date()
        }
        setLocalCharacters(prev => [newLocalChar, ...prev])
    }
    setShowCharModal(false)
  }

  // 2. 删除角色 (隔离)
  const handleDeleteChar = async (id: number | string) => {
      if (isAdmin && typeof id === 'number') {
          if(!confirm("确定要永久删除这个云端角色吗？")) return
          await deleteAICharacter(id)
          refreshDbData()
      } else if (!isAdmin && typeof id === 'string') {
          setLocalCharacters(prev => prev.filter(c => c.id !== id))
      }
  }

  // 3. 创建会话 (隔离)
  const handleCreateSession = async () => {
    if (!newSessionName || selectedCharIds.length === 0) return alert("请填写完整")
    
    if (isAdmin) {
        // Admin -> 创建 DB 会话 (使用选中的 DB 角色)
        // 注意：selectedCharIds 存的是字符串，需要转回数字
        const dbIds = selectedCharIds.map(id => parseInt(id)).filter(id => !isNaN(id))
        
        if (dbIds.length === 0) return alert("请选择有效的云端角色")

        const session = await createChatSession(newSessionName, dbIds)
        refreshDbData()
        setActiveSession(session)
    } else {
        // Guest -> 创建 Local 会话 (使用选中的 Local 角色)
        const selectedChars = localCharacters.filter(c => selectedCharIds.includes(c.id))
        
        const newSession = {
            id: `session_${Date.now()}`,
            name: newSessionName,
            participants: selectedChars, // 存入当时的角色快照
            messages: [],
            updatedAt: new Date()
        }
        setLocalSessions(prev => [newSession, ...prev])
        setActiveSession(newSession)
    }
    setShowSessionModal(false)
  }

  // 4. 删除会话 (隔离)
  const handleDeleteSession = async (e: React.MouseEvent, id: number | string) => {
    e.stopPropagation() 
    if (!confirm("确定要删除这个群聊吗？")) return

    if (isAdmin && typeof id === 'number') {
        try {
            await deleteChatSession(id)
            refreshDbData()
        } catch (err) { alert("删除失败") }
    } else if (!isAdmin && typeof id === 'string') {
        setLocalSessions(prev => prev.filter(s => s.id !== id))
    }

    if (activeSession?.id === id) setActiveSession(null)
  }

  // 5. 发送消息 (根据当前 activeSession 类型分发)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || isProcessing || !activeSession) return

    const content = inputMsg
    setInputMsg('')
    setIsProcessing(true)

    // 用户消息上屏
    const userMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTypingIndex(prev => prev + 1) 

    // 持久化用户消息
    if (typeof activeSession.id === 'number') {
        await saveUserMessage(activeSession.id, content)
    } else {
        updateLocalSessionMessages(activeSession.id, userMsg)
    }

    // AI 轮流回复
    const participants = activeSession.participants || []
    let currentHistory = [...messages, userMsg] 

    for (const char of participants) {
        setCurrentThinkingAI(char.name)
        await new Promise(r => setTimeout(r, 800))

        let res;
        
        if (typeof activeSession.id === 'number') {
            // Admin: 调 DB 接口
            res = await triggerAIReply(activeSession.id, char.id)
        } else {
            // Guest: 调 Stateless 接口
            // 构造带名字的上下文
            const historyPayload = currentHistory.map(m => {
                let prefix = "User";
                if (m.role !== 'user') prefix = m.character?.name || m.name || "Assistant"
                return { role: m.role, content: `${prefix}: ${m.content}` }
            })
            const allNames = ['User', ...participants.map((p: any) => p.name)]
            
            res = await chatWithAIStateless({
                character: { name: char.name, systemPrompt: char.systemPrompt },
                history: historyPayload,
                participantsNames: allNames
            })
            if (res.success && res.message) res.message.character = char 
        }

        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message])
            currentHistory.push(res.message) 
            
            if (typeof activeSession.id !== 'number') {
                updateLocalSessionMessages(activeSession.id, res.message)
            }
        }
    }

    setCurrentThinkingAI('')
    setIsProcessing(false)
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
                <button onClick={() => setShowCharModal(true)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 transition">角色管理</button>
            </div>
        </div>
        
        {/* 会话列表 (只显示当前身份对应的会话) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {displaySessions.length === 0 && (
                <div className="text-center text-xs text-slate-600 mt-10">暂无{isAdmin ? '云端' : '本地'}会话</div>
            )}
            {displaySessions.map(s => (
                <div key={s.id} className="group relative">
                    <button 
                        onClick={() => setActiveSession(s)}
                        className={`w-full text-left p-3 pr-9 rounded-xl transition flex items-center gap-3 ${activeSession?.id === s.id ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'hover:bg-slate-800/50 text-slate-400'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isAdmin ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                            {s.name[0]}
                        </div>
                        <div className="overflow-hidden">
                            <div className="font-medium text-sm truncate">{s.name}</div>
                            <div className="text-[10px] opacity-60 truncate">
                                {s.participants?.length || 0} 位成员
                            </div>
                        </div>
                    </button>
                    {/* 删除按钮 */}
                    <button
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md hover:bg-slate-700/50"
                        title="删除会话"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            ))}
        </div>
        <div className="p-4 border-t border-slate-800/50">
            <button onClick={() => router.push('/')} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">← 返回导航站</button>
        </div>
      </div>

      {/* 主界面 */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
         {activeSession ? (
            <>
                <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-sm z-10">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">
                            {activeSession.name}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isAdmin ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {isAdmin ? 'Cloud' : 'Local'}
                            </span>
                        </h2>
                        <div className="flex -space-x-2 mt-1">
                            {activeSession.participants?.map((p: any) => (
                                <img key={p.id} src={p.avatar} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 object-cover" />
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg, idx) => {
                        if (idx > typingIndex) return null;
                        const isUser = msg.role === 'user'
                        const isTyping = idx === typingIndex && !isUser;

                        return (
                            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isUser && (
                                    <div className="flex flex-col items-center gap-1">
                                        <img src={msg.character?.avatar} className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700" />
                                        <span className="text-[10px] text-slate-500 max-w-[60px] truncate">{msg.character?.name}</span>
                                    </div>
                                )}
                                <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                    {isTyping ? (
                                        <Typewriter text={msg.content} onComplete={() => setTypingIndex(prev => prev + 1)} />
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {currentThinkingAI && (
                        <div className="flex gap-4 animate-pulse opacity-70">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-[10px] text-slate-500">{currentThinkingAI} 正在思考...</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input 
                            type="text" 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            disabled={isProcessing}
                            placeholder={isProcessing ? "讨论中..." : "输入消息..."}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                        <button type="submit" disabled={!inputMsg.trim() || isProcessing} className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        </button>
                    </form>
                </div>
            </>
         ) : (
             <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <p>请在左侧选择或创建一个群聊</p>
             </div>
         )}
      </div>

      {/* 角色管理 Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-white mb-4">角色管理 <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : '本地'})</span></h3>
                 <div className="space-y-4">
                    <input placeholder="角色名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.name} onChange={e => setNewChar({...newChar, name: e.target.value})} />
                    <input placeholder="简短描述" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.desc} onChange={e => setNewChar({...newChar, desc: e.target.value})} />
                    <textarea placeholder="系统提示词..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-24" value={newChar.prompt} onChange={e => setNewChar({...newChar, prompt: e.target.value})} />
                    <input placeholder="头像 URL (可选)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.avatar} onChange={e => setNewChar({...newChar, avatar: e.target.value})} />
                </div>
                 <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowCharModal(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button>
                    <button onClick={handleCreateChar} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm shadow-lg shadow-emerald-500/20">创建角色</button>
                 </div>
                 
                 {/* 列表显示 (只显示当前环境的角色) */}
                 <div className="mt-6 pt-4 border-t border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                    {displayCharacters.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded group">
                            <span className="text-xs text-slate-300 flex items-center gap-2">
                                <img src={c.avatar} className="w-5 h-5 rounded-full bg-slate-700" />
                                {c.name}
                            </span>
                            <button onClick={() => handleDeleteChar(c.id)} className="text-xs text-slate-600 group-hover:text-red-400">删除</button>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
      )}

      {/* 会话创建 Modal */}
      {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-4">创建新群聊 <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : '本地'})</span></h3>
                  <div className="space-y-4">
                        <input placeholder="群聊名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                        <p className="text-xs text-slate-500">选择参与角色 (仅限{isAdmin ? '云端' : '本地'}角色)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {displayCharacters.map(c => (
                                <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(String(c.id)) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                    <input type="checkbox" className="hidden" 
                                        checked={selectedCharIds.includes(String(c.id))}
                                        onChange={e => {
                                            const sid = String(c.id)
                                            if(e.target.checked) setSelectedCharIds([...selectedCharIds, sid])
                                            else setSelectedCharIds(selectedCharIds.filter(id => id !== sid))
                                        }}
                                    />
                                    <img src={c.avatar} className="w-6 h-6 rounded-full" />
                                    <span className="text-xs text-slate-200 truncate">{c.name}</span>
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
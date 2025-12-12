// app/ai-chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  getAICharacters, createAICharacter, deleteAICharacter, getAdminStatus,
  getChatSessions, createChatSession, getSessionMessages,
  saveUserMessage, triggerAIReply, chatWithAIStateless 
} from '../ai-actions'
import { useRouter } from 'next/navigation'

// ... (Typewriter 组件保持不变，请保留) ...
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
  
  // ✨ 本地缓存数据
  const [localCharacters, setLocalCharacters] = useState<any[]>([])
  const [localSessions, setLocalSessions] = useState<any[]>([])

  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [typingIndex, setTypingIndex] = useState(0)

  // UI
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCharModal, setShowCharModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [currentThinkingAI, setCurrentThinkingAI] = useState<string>('') 
  const [newChar, setNewChar] = useState({ name: '', prompt: '', avatar: '', desc: '' })
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]) // 兼容 ID 为 string 的本地角色

  const scrollRef = useRef<HTMLDivElement>(null)

  // --- Initialization ---
  useEffect(() => {
    // 1. 获取管理员状态和 DB 数据
    getAdminStatus().then(setIsAdmin)
    refreshDbData()

    // 2. 加载本地数据
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
    
    // 如果是 DB 会话 (ID 是数字)
    if (typeof activeSession.id === 'number') {
       getSessionMessages(activeSession.id).then(msgs => {
         setMessages(msgs)
         setTypingIndex(msgs.length)
       })
    } else {
       // 如果是本地会话 (ID 是字符串)，直接从对象里读 messages
       setMessages(activeSession.messages || [])
       setTypingIndex((activeSession.messages || []).length)
    }
  }, [activeSession]) // 注意：这里 activeSession 变化时只加载一次，后续更新 activeSession 需要手动维护 messages

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, currentThinkingAI, typingIndex])

  // --- 合并展示列表 ---
  const allCharacters = [...dbCharacters, ...localCharacters]
  const allSessions = [...dbSessions, ...localSessions]

  // --- Actions ---

  const handleCreateChar = async () => {
    if (isAdmin) {
        // 管理员：存数据库
        const fd = new FormData()
        fd.append('name', newChar.name); fd.append('systemPrompt', newChar.prompt); 
        fd.append('description', newChar.desc); fd.append('avatar', newChar.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${newChar.name}`)
        await createAICharacter(fd)
        refreshDbData()
    } else {
        // 游客：存本地
        const newLocalChar = {
            id: `local_${Date.now()}`, // 字符串 ID
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

  const handleDeleteChar = async (id: number | string) => {
      if (typeof id === 'number') {
          if(!isAdmin) return alert("只有管理员可以删除内置角色")
          await deleteAICharacter(id)
          refreshDbData()
      } else {
          setLocalCharacters(prev => prev.filter(c => c.id !== id))
      }
  }

  const handleCreateSession = async () => {
    if (!newSessionName || selectedCharIds.length === 0) return alert("请填写完整")
    
    // 找出选中的角色对象
    const selectedChars = allCharacters.filter(c => selectedCharIds.includes(String(c.id))) // 统一转字符串比较

    if (isAdmin) {
        // 只有当选中的全是 DB 角色时，管理员才能创建 DB 会话 (简化逻辑)
        // 或者管理员也可以创建本地测试会话。为了简单，我们假定管理员操作 DB
        const dbIds = selectedChars.filter(c => typeof c.id === 'number').map(c => c.id)
        if (dbIds.length !== selectedChars.length) {
            alert("数据库会话只能包含数据库角色。您选中了本地角色，将创建为本地会话。")
            createLocalSession(selectedChars)
        } else {
            const session = await createChatSession(newSessionName, dbIds)
            refreshDbData()
            setActiveSession(session)
        }
    } else {
        createLocalSession(selectedChars)
    }
    setShowSessionModal(false)
  }

  const createLocalSession = (participants: any[]) => {
      const newSession = {
          id: `session_${Date.now()}`,
          name: newSessionName,
          participants: participants, // 直接存完整对象
          messages: [],
          updatedAt: new Date()
      }
      setLocalSessions(prev => [newSession, ...prev])
      setActiveSession(newSession)
  }

  // ✨✨✨ 核心：发送消息 ✨✨✨
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || isProcessing || !activeSession) return

    const content = inputMsg
    setInputMsg('')
    setIsProcessing(true)

    // 1. 用户消息上屏
    const userMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() }
    
    // 更新 UI State
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setTypingIndex(prev => prev + 1) // 用户不用打字

    // 2. 持久化 (根据会话类型)
    if (typeof activeSession.id === 'number') {
        // DB 会话
        await saveUserMessage(activeSession.id, content)
    } else {
        // 本地会话：更新 activeSession 和 localSessions
        updateLocalSessionMessages(activeSession.id, userMsg)
    }

    // 3. AI 轮流回复
    const participants = activeSession.participants || []
    
    // 我们需要维护一个临时的 history 链，让后面的 AI 能看到前面的 AI 说了啥
    let currentHistory = [...updatedMessages] 

    for (const char of participants) {
        setCurrentThinkingAI(char.name)
        await new Promise(r => setTimeout(r, 800))

        let res;
        
        if (typeof activeSession.id === 'number') {
            // --- DB 模式 ---
            res = await triggerAIReply(activeSession.id, char.id)
        } else {
            // --- 本地模式 (Stateless) ---
            // 构造上下文给后端
            // 将 history 格式化为后端 chatWithAIStateless 需要的格式
            const historyPayload = currentHistory.map(m => {
                // 如果消息是 AI 发的，我们需要拼上 "Name: " 前缀给 context
                // 但注意，我们之前后端的逻辑是接收 {role, content}，然后自己拼。
                // 这里的 content 已经是纯文本了。
                // 为了让 Stateless Action 能分清谁是谁，我们需要在 content 里带上名字吗？
                // 看后端 chatWithAIStateless 实现：它直接 map content。
                // 所以我们这里需要手动构建带名字的 content 传给后端作为 history
                // 查找这个消息是谁发的
                let prefix = "User";
                if (m.role !== 'user') {
                    prefix = m.character?.name || m.name || "Assistant" // 兼容本地结构
                }
                return {
                    role: m.role,
                    content: `${prefix}: ${m.content}`
                }
            })

            const allNames = ['User', ...participants.map((p: any) => p.name)]
            
            res = await chatWithAIStateless({
                character: { name: char.name, systemPrompt: char.systemPrompt },
                history: historyPayload, // 传最后20条即可
                participantsNames: allNames
            })
            
            // 补全本地需要的数据结构
            if (res.success && res.message) {
                 // 给返回的消息加上 character 对象引用，方便头像显示
                 res.message.character = char 
            }
        }

        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message])
            currentHistory.push(res.message) // 加入临时历史，供下一位参考
            
            if (typeof activeSession.id !== 'number') {
                updateLocalSessionMessages(activeSession.id, res.message)
            }
        }
    }

    setCurrentThinkingAI('')
    setIsProcessing(false)
  }

  // 辅助：更新本地会话的消息
  const updateLocalSessionMessages = (sessionId: string, newMsg: any) => {
      setLocalSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return { ...s, messages: [...(s.messages || []), newMsg], updatedAt: new Date() }
          }
          return s
      }))
      // 同时更新当前 activeSession 的引用，防止下次渲染 stale
      setActiveSession((prev: any) => {
          if (prev?.id === sessionId) {
               return { ...prev, messages: [...(prev.messages || []), newMsg] }
          }
          return prev
      })
  }
  
  // ... (JSX 渲染部分) ...
  // 大部分 JSX 保持不变，只需修改列表渲染和创建逻辑

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* 侧边栏 */}
      <div className="w-64 bg-slate-900/80 border-r border-slate-700/50 flex flex-col backdrop-blur-md">
        <div className="p-4 border-b border-slate-800/50">
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-lg">AI Group Chat</h1>
            <div className="text-[10px] text-slate-500 mb-2">
                {isAdmin ? '👑 管理员模式 (云端同步)' : '👤 访客模式 (本地缓存)'}
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowSessionModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-xs py-2 rounded text-white transition">+ 新群聊</button>
                <button onClick={() => setShowCharModal(true)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 transition">角色管理</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {allSessions.map(s => (
                <button 
                    key={s.id} 
                    onClick={() => setActiveSession(s)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${activeSession?.id === s.id ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'hover:bg-slate-800/50 text-slate-400'}`}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 relative">
                        {s.name[0]}
                        {/* 标记是否为本地会话 */}
                        {typeof s.id === 'string' && <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" title="本地会话"></span>}
                    </div>
                    <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-[10px] opacity-60 truncate">
                            {s.participants?.length || 0} 位 AI 成员
                        </div>
                    </div>
                </button>
            ))}
        </div>
        <div className="p-4 border-t border-slate-800/50">
            <button onClick={() => router.push('/')} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">← 返回导航站</button>
        </div>
      </div>

      {/* 主界面 (保持之前的逻辑，只需在渲染消息时传入 typingIndex) */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
         {activeSession ? (
            <>
                <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-sm z-10">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">
                            {activeSession.name}
                            {typeof activeSession.id === 'string' && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">Local</span>}
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
                        // ... 这里的渲染逻辑和上一轮代码完全一致，直接复用 Typewriter ...
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
                    {/* ... 思考指示器 ... */}
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
                
                {/* 输入框区域保持不变 */}
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
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </>
         ) : (
             <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
                <p>请选择或创建群聊</p>
             </div>
         )}
      </div>

      {/* Modal 部分略微修改，如果是游客则不显示“保存到DB”的暗示 */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             {/* ... 创建角色的 Modal 内容，保持结构不变，handleCreateChar 已经处理了逻辑 ... */}
             <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                 <h3 className="text-lg font-bold text-white mb-4">创建 AI 角色 {isAdmin ? '(云端)' : '(本地)'}</h3>
                 {/* Input Fields ... */}
                 <div className="space-y-4">
                    <input placeholder="角色名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.name} onChange={e => setNewChar({...newChar, name: e.target.value})} />
                    <input placeholder="简短描述" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.desc} onChange={e => setNewChar({...newChar, desc: e.target.value})} />
                    <textarea placeholder="系统提示词..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-24" value={newChar.prompt} onChange={e => setNewChar({...newChar, prompt: e.target.value})} />
                    <input placeholder="头像 URL (可选)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.avatar} onChange={e => setNewChar({...newChar, avatar: e.target.value})} />
                </div>
                 <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowCharModal(false)} className="px-4 py-2 text-slate-400 text-sm">取消</button>
                    <button onClick={handleCreateChar} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm">创建</button>
                 </div>
                 {/* 列表显示 */}
                 <div className="mt-6 pt-4 border-t border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                    {allCharacters.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded">
                            <span className="text-xs text-slate-300 flex items-center gap-1">
                                {c.name} {typeof c.id === 'string' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                            </span>
                            <button onClick={() => handleDeleteChar(c.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
      )}

      {/* Session Modal 类似处理 ... */}
      {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">创建新群聊 {isAdmin ? '(默认云端)' : '(本地)'}</h3>
                  <div className="space-y-4">
                        <input placeholder="群聊名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {allCharacters.map(c => (
                                <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(String(c.id)) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
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
                      <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-slate-400 text-sm">取消</button>
                      <button onClick={handleCreateSession} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">开始群聊</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
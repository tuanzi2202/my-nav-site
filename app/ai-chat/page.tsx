// app/ai-chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  getAICharacters, createAICharacter, deleteAICharacter,
  getChatSessions, createChatSession, getSessionMessages,
  saveUserMessage, triggerAIReply 
} from '../ai-actions'
import { useRouter } from 'next/navigation'

export default function AIChatPage() {
  const router = useRouter()
  // Data State
  const [characters, setCharacters] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  
  // UI State
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCharModal, setShowCharModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [currentThinkingAI, setCurrentThinkingAI] = useState<string>('') // 正在思考的 AI 名字

  // New Character Form
  const [newChar, setNewChar] = useState({ name: '', prompt: '', avatar: '', desc: '' })
  // New Session Form
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)

  // Init Load
  useEffect(() => {
    refreshData()
  }, [])

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, currentThinkingAI])

  // Load Messages when session changes
  useEffect(() => {
    if (activeSession) {
      getSessionMessages(activeSession.id).then(setMessages)
    }
  }, [activeSession])

  const refreshData = async () => {
    const [c, s] = await Promise.all([getAICharacters(), getChatSessions()])
    setCharacters(c)
    setSessions(s)
  }

  // --- Handlers ---

  const handleCreateChar = async () => {
    const fd = new FormData()
    fd.append('name', newChar.name)
    fd.append('systemPrompt', newChar.prompt)
    fd.append('description', newChar.desc)
    fd.append('avatar', newChar.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${newChar.name}`)
    await createAICharacter(fd)
    setShowCharModal(false)
    refreshData()
  }

  const handleCreateSession = async () => {
    if(!newSessionName || selectedCharIds.length === 0) return alert("请填写名称并至少选择一个AI")
    const session = await createChatSession(newSessionName, selectedCharIds)
    await refreshData()
    setActiveSession(session) // 选中新会话，但需要重新获取带 participants 的完整对象
    const fullSessions = await getChatSessions()
    setActiveSession(fullSessions.find(s => s.id === session.id))
    setShowSessionModal(false)
  }

  // ✨✨✨ 核心逻辑：群聊轮流发言 ✨✨✨
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || isProcessing || !activeSession) return

    const content = inputMsg
    setInputMsg('')
    setIsProcessing(true)

    // 1. 用户发言上屏
    const optimisitcMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() }
    setMessages(prev => [...prev, optimisitcMsg])
    
    // 2. 保存到数据库
    await saveUserMessage(activeSession.id, content)

    // 3. 轮流触发 AI (Chain of Thought / Discussion)
    // 这里的逻辑是：按 participants 顺序依次调用 API
    // 更好的方式可能是并行或者让 AI 决定是否发言，为了效果明显，我们这里做顺序发言
    const participants = activeSession.participants || []
    
    for (const char of participants) {
        setCurrentThinkingAI(char.name) // UI 显示正在思考
        
        // 延迟一点点，增加真实感
        await new Promise(r => setTimeout(r, 800))

        const res = await triggerAIReply(activeSession.id, char.id)
        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message])
        }
    }

    setCurrentThinkingAI('')
    setIsProcessing(false)
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* --- 左侧边栏：会话列表 --- */}
      <div className="w-64 bg-slate-900/80 border-r border-slate-700/50 flex flex-col backdrop-blur-md">
        <div className="p-4 border-b border-slate-800/50">
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-lg">AI Group Chat</h1>
            <div className="flex gap-2 mt-4">
                <button onClick={() => setShowSessionModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-xs py-2 rounded text-white transition">+ 新群聊</button>
                <button onClick={() => setShowCharModal(true)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 transition">角色管理</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {sessions.map(s => (
                <button 
                    key={s.id} 
                    onClick={() => setActiveSession(s)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${activeSession?.id === s.id ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'hover:bg-slate-800/50 text-slate-400'}`}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {s.name[0]}
                    </div>
                    <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-[10px] opacity-60 truncate">
                            {s.participants.length} 位 AI 成员
                        </div>
                    </div>
                </button>
            ))}
        </div>
        <div className="p-4 border-t border-slate-800/50">
            <button onClick={() => router.push('/')} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">← 返回导航站</button>
        </div>
      </div>

      {/* --- 主聊天区域 --- */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
        {activeSession ? (
            <>
                {/* 顶部标题 */}
                <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-sm z-10">
                    <div>
                        <h2 className="font-bold text-white">{activeSession.name}</h2>
                        <div className="flex -space-x-2 mt-1">
                            {activeSession.participants.map((p: any) => (
                                <img key={p.id} src={p.avatar} alt={p.name} title={p.name} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 object-cover" />
                            ))}
                        </div>
                    </div>
                </header>

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user'
                        return (
                            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                                {!isUser && (
                                    <div className="flex flex-col items-center gap-1">
                                        <img src={msg.character?.avatar} className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700" />
                                        <span className="text-[10px] text-slate-500 max-w-[60px] truncate">{msg.character?.name}</span>
                                    </div>
                                )}
                                <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        )
                    })}
                    
                    {/* 思考状态指示器 */}
                    {currentThinkingAI && (
                        <div className="flex gap-4 animate-pulse">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-[10px] text-slate-500">{currentThinkingAI} 正在输入...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 输入框 */}
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input 
                            type="text" 
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            disabled={isProcessing}
                            placeholder={isProcessing ? "AI 们正在热烈讨论中..." : "开启一个话题，让大家开始讨论..."}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-800 transition disabled:opacity-50"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputMsg.trim() || isProcessing}
                            className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-4">
                <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                <p>请选择或创建一个群聊会话</p>
            </div>
        )}
      </div>

      {/* --- Modal: Create Character --- */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-4">创建 AI 角色</h3>
                <div className="space-y-4">
                    <input placeholder="角色名称 (如: 辩论专家)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.name} onChange={e => setNewChar({...newChar, name: e.target.value})} />
                    <input placeholder="简短描述 (如: 擅长反驳)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.desc} onChange={e => setNewChar({...newChar, desc: e.target.value})} />
                    <textarea placeholder="系统提示词 (System Prompt) - 定义性格、语气、立场的核心..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-24" value={newChar.prompt} onChange={e => setNewChar({...newChar, prompt: e.target.value})} />
                    <input placeholder="头像 URL (可选)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newChar.avatar} onChange={e => setNewChar({...newChar, avatar: e.target.value})} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowCharModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                    <button onClick={handleCreateChar} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm">创建角色</button>
                </div>
                
                {/* 简单的列表显示已有角色，支持删除 */}
                <div className="mt-6 pt-4 border-t border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-2">已有角色</p>
                    {characters.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded">
                            <span className="text-xs text-slate-300">{c.name}</span>
                            <button onClick={() => deleteAICharacter(c.id).then(refreshData)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- Modal: Create Session --- */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-4">创建新群聊</h3>
                <div className="space-y-4">
                    <input placeholder="群聊名称 (如: 哲学大乱斗)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                    <div>
                        <p className="text-xs text-slate-400 mb-2">选择参会 AI 角色 (多选)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {characters.map(c => (
                                <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(c.id) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={selectedCharIds.includes(c.id)}
                                        onChange={e => {
                                            if(e.target.checked) setSelectedCharIds([...selectedCharIds, c.id])
                                            else setSelectedCharIds(selectedCharIds.filter(id => id !== c.id))
                                        }}
                                    />
                                    <img src={c.avatar} className="w-6 h-6 rounded-full" />
                                    <span className="text-xs text-slate-200 truncate">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">取消</button>
                    <button onClick={handleCreateSession} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">开始群聊</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
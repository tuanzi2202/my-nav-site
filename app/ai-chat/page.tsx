// app/ai-chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  getAICharacters, createAICharacter, updateAICharacter, deleteAICharacter, getAdminStatus,
  getChatSessions, createChatSession, deleteChatSession, addParticipantsToSession,
  getSessionMessages, saveUserMessage, triggerAIReply, chatWithAIStateless 
} from '../ai-actions'
import { useRouter } from 'next/navigation'
import { loginAdmin, logoutAdmin } from '../actions' 
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import CodeBlock from '../blog/_components/CodeBlock'

// --- 类型定义 ---
type AIChatConfig = {
  apiSource: 'server' | 'custom'
  customApiUrl: string
  customApiKey: string
  customModel: string
}

const DEFAULT_CONFIG: AIChatConfig = {
  apiSource: 'server',
  customApiUrl: 'https://api.openai.com/v1/chat/completions',
  customApiKey: '',
  customModel: 'gpt-3.5-turbo'
}

// ... (MarkdownRenderer 和 Typewriter 组件保持不变) ...
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none 
      prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0
      prose-code:text-sky-300 prose-code:bg-slate-950/30 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline" {...props}>{children}</a>
          ),
          pre: ({ node, children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

const Typewriter = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    indexRef.current = 0
    setDisplayedText('')
    const intervalId = setInterval(() => {
      indexRef.current++
      setDisplayedText(text.slice(0, indexRef.current))
      if (indexRef.current >= text.length) {
        clearInterval(intervalId)
        onCompleteRef.current() 
      }
    }, 20) 
    return () => clearInterval(intervalId)
  }, [text]) 

  return (
    <div className="relative">
      <MarkdownRenderer content={displayedText} />
      <span className="inline-block w-2 h-4 bg-sky-400 ml-1 align-middle animate-pulse" />
    </div>
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
  const [typingIndex, setTypingIndex] = useState(0)

  // UI
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCharModal, setShowCharModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [currentThinkingAI, setCurrentThinkingAI] = useState<string>('') 
  
  // ✨✨✨ 新增：设置相关 State ✨✨✨
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [config, setConfig] = useState<AIChatConfig>(DEFAULT_CONFIG)

  // 编辑状态
  const [editingCharId, setEditingCharId] = useState<string | number | null>(null)
  const [charForm, setCharForm] = useState({ name: '', prompt: '', avatar: '', desc: '', isPublic: false })
  const [newSessionName, setNewSessionName] = useState('')
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]) 

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

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

    // ✨✨✨ 读取本地配置 ✨✨✨
    const savedConfig = localStorage.getItem('ai_chat_user_config')
    if (savedConfig) {
        try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) }) } catch (e) { console.error(e) }
    }
  }, [])

  useEffect(() => { localStorage.setItem('local_ai_characters', JSON.stringify(localCharacters)) }, [localCharacters])
  useEffect(() => { localStorage.setItem('local_ai_sessions', JSON.stringify(localSessions)) }, [localSessions])
  
  // ✨✨✨ 保存配置 ✨✨✨
  const updateConfig = (key: keyof AIChatConfig, value: string) => {
      setConfig(prev => {
          const next = { ...prev, [key]: value }
          localStorage.setItem('ai_chat_user_config', JSON.stringify(next))
          return next
      })
  }

  const refreshDbData = async () => {
    const [c, s] = await Promise.all([getAICharacters(), getChatSessions()])
    setDbCharacters(c)
    setDbSessions(s)
  }

  useEffect(() => {
    if (!activeSession) return
    if (typeof activeSession.id === 'number') {
       const latestSession = dbSessions.find(s => s.id === activeSession.id)
       if (latestSession && JSON.stringify(latestSession.participants) !== JSON.stringify(activeSession.participants)) {
           setActiveSession(latestSession)
       }
       getSessionMessages(activeSession.id).then(msgs => {
         setMessages(msgs)
         setTypingIndex(msgs.length) 
       })
    } else {
       setMessages(activeSession.messages || [])
       setTypingIndex((activeSession.messages || []).length)
    }
  }, [activeSession?.id, dbSessions])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, currentThinkingAI, typingIndex])

  const displayCharacters = isAdmin ? dbCharacters : [...dbCharacters, ...localCharacters]
  const displaySessions = isAdmin ? dbSessions : localSessions

  // ... (Modal 开关和基础 CRUD 函数保持不变) ...
  const openCreateModal = () => { setEditingCharId(null); setCharForm({ name: '', prompt: '', avatar: '', desc: '', isPublic: false }); setShowCharModal(true); }
  const openEditModal = (char: any) => { setEditingCharId(char.id); setCharForm({ name: char.name, prompt: char.systemPrompt, desc: char.description || '', avatar: char.avatar || '', isPublic: char.isPublic || false }); setShowCharModal(true); }
  const handleDeleteChar = async (id: number | string) => { if (typeof id === 'number') { if (!isAdmin) return alert("无法删除云端公开角色"); if (!confirm("确定要永久删除这个角色吗？")) return; await deleteAICharacter(id); refreshDbData(); } else { setLocalCharacters(prev => prev.filter(c => c.id !== id)); } }
  const handleCreateSession = async () => { if (!newSessionName || selectedCharIds.length === 0) return alert("请填写完整"); if (isAdmin) { const dbIds = selectedCharIds.map(id => parseInt(id)).filter(id => !isNaN(id)); if (dbIds.length !== selectedCharIds.length) return alert("云端会话不能包含本地角色"); const session = await createChatSession(newSessionName, dbIds); refreshDbData(); setActiveSession(session); } else { const selectedChars = displayCharacters.filter(c => selectedCharIds.includes(String(c.id))); const newSession = { id: `session_${Date.now()}`, name: newSessionName, participants: selectedChars, messages: [], updatedAt: new Date() }; setLocalSessions(prev => [newSession, ...prev]); setActiveSession(newSession); } setShowSessionModal(false); }
  const handleDeleteSession = async (e: React.MouseEvent, id: number | string) => { e.stopPropagation(); if (!confirm("确定要删除这个群聊吗？")) return; if (isAdmin && typeof id === 'number') { try { await deleteChatSession(id); refreshDbData(); } catch (err) { alert("删除失败"); } } else if (!isAdmin && typeof id === 'string') { setLocalSessions(prev => prev.filter(s => s.id !== id)); } if (activeSession?.id === id) setActiveSession(null); }
  const handleAddMembers = async () => { if (!activeSession || selectedCharIds.length === 0) return; if (typeof activeSession.id === 'number') { const dbIds = selectedCharIds.map(id => parseInt(id)).filter(id => !isNaN(id)); if (dbIds.length !== selectedCharIds.length) return alert("云端会话不能添加本地角色"); await addParticipantsToSession(activeSession.id, dbIds); await refreshDbData(); } else { const newChars = displayCharacters.filter(c => selectedCharIds.includes(String(c.id))); setLocalSessions(prev => prev.map(s => { if (s.id === activeSession.id) { return { ...s, participants: [...s.participants, ...newChars] } } return s })); setActiveSession((prev: any) => ({ ...prev, participants: [...prev.participants, ...newChars] })); } setShowAddMemberModal(false); setSelectedCharIds([]); }
  const openAddMemberModal = () => { setSelectedCharIds([]); setShowAddMemberModal(true); }
  const handleSaveChar = async () => { if (!charForm.name || !charForm.prompt) return alert("请填写名称和提示词"); const avatarUrl = charForm.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${charForm.name}`; if (isAdmin) { const fd = new FormData(); fd.append('name', charForm.name); fd.append('systemPrompt', charForm.prompt); fd.append('description', charForm.desc); fd.append('avatar', avatarUrl); if (charForm.isPublic) fd.append('isPublic', 'on'); if (editingCharId && typeof editingCharId === 'number') { fd.append('id', String(editingCharId)); await updateAICharacter(fd); } else { await createAICharacter(fd); } refreshDbData(); } else { if (editingCharId && typeof editingCharId === 'string') { setLocalCharacters(prev => prev.map(c => c.id === editingCharId ? { ...c, name: charForm.name, systemPrompt: charForm.prompt, description: charForm.desc, avatar: avatarUrl } : c)); } else { setLocalCharacters(prev => [{ id: `local_char_${Date.now()}`, name: charForm.name, systemPrompt: charForm.prompt, description: charForm.desc, avatar: avatarUrl, createdAt: new Date() }, ...prev]); } } setShowCharModal(false); }
  const handleLogin = async (formData: FormData) => { const username = formData.get('username') as string; const password = formData.get('password') as string; const success = await loginAdmin(username, password); if (success) { setIsAdmin(true); setShowAuthModal(false); setAuthError(''); router.refresh(); refreshDbData(); } else { setAuthError('账号或密码错误'); } }
  const handleLogout = async () => { await logoutAdmin(); setIsAdmin(false); setShowUserMenu(false); router.refresh(); refreshDbData(); }

  // ✨✨✨ 客户端调用自定义 API 核心函数 ✨✨✨
  const callCustomAI = async (character: any, history: any[], participantsNames: string[]) => {
      const otherNames = participantsNames.filter(n => n !== character.name).join(', ')
      
      const contextMessages = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: `${msg.role === 'user' ? 'User' : (msg.character?.name || msg.name || 'Assistant')}: ${msg.content}`
      }))

      try {
          if (!config.customApiKey) throw new Error("请先在设置中配置 API Key")

          const res = await fetch(config.customApiUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.customApiKey}`
              },
              body: JSON.stringify({
                  model: config.customModel,
                  messages: [
                      { 
                          role: 'system', 
                          content: `You are ${character.name}. ${character.systemPrompt}. 
                                    [Context] Group Chat Participants: [${otherNames}, and You].
                                    [Instructions]
                                    1. Decide who to reply to.
                                    2. Use "@Name" to mention others.
                                    3. DO NOT output your own name prefix.
                                    4. Keep it natural.
                                    5. If writing code, MUST use Markdown code blocks.` 
                      },
                      ...contextMessages
                  ],
                  max_tokens: 200,
                  temperature: 0.7
              })
          })
          
          const data = await res.json()
          if (data.error) throw new Error(data.error.message)
          
          let replyContent = data.choices?.[0]?.message?.content || '...'
          const namePrefixRegex = new RegExp(`^(${character.name}[:：]|@?${character.name}\\s+)`, 'i')
          if (namePrefixRegex.test(replyContent)) replyContent = replyContent.replace(namePrefixRegex, '').trim()

          return {
              success: true,
              message: {
                  id: Date.now(),
                  role: 'assistant',
                  content: replyContent,
                  character: character 
              }
          }
      } catch (e: any) {
          console.error(e)
          return { success: false, error: e.message || 'Network Error' }
      }
  }

  // --- 发送消息逻辑 ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || isProcessing || !activeSession) return
    const content = inputMsg; setInputMsg(''); setIsProcessing(true)

    const userMsg = { id: Date.now(), role: 'user', content, createdAt: new Date() }
    setMessages(prev => [...prev, userMsg])
    setTypingIndex(prev => prev + 1) 

    if (typeof activeSession.id === 'number') await saveUserMessage(activeSession.id, content)
    else updateLocalSessionMessages(activeSession.id, userMsg)

    const participants = activeSession.participants || []
    let currentHistory = [...messages, userMsg] 

    for (const char of participants) {
        setCurrentThinkingAI(char.name)
        await new Promise(r => setTimeout(r, 800))
        
        let res;
        
        // ✨✨✨ 判断：云端会话走服务器，本地会话走 (自定义API 或 服务器Action) ✨✨✨
        if (typeof activeSession.id === 'number') {
            // 云端会话：强制走服务器 Action (需要 DB 写入)
            res = await triggerAIReply(activeSession.id, char.id)
        } else {
            // 本地会话：判断配置
            if (config.apiSource === 'custom') {
                // 走客户端直连自定义 API
                const allNames = ['User', ...participants.map((p: any) => p.name)]
                res = await callCustomAI(char, currentHistory, allNames)
            } else {
                // 走默认服务器 Action (Stateless)
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
        }

        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message])
            currentHistory.push(res.message) 
            if (typeof activeSession.id !== 'number') updateLocalSessionMessages(activeSession.id, res.message)
        } else if (!res.success && typeof activeSession.id !== 'number') {
            // 错误提示
            const errorMsg = { id: Date.now(), role: 'system', content: `[系统错误] ${char.name}: ${res.error}` }
            setMessages(prev => [...prev, errorMsg])
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
                {/* ✨✨✨ 设置按钮 ✨✨✨ */}
                <button onClick={() => setShowConfigModal(true)} className="w-8 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded text-slate-300 flex items-center justify-center transition" title="API 设置">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
            </div>
            <button onClick={openCreateModal} className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded text-slate-300 transition">角色管理</button>
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
         <div className="absolute top-4 right-6 z-50">
            <button 
                onClick={() => isAdmin ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-lg border backdrop-blur-md group ${isAdmin ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-indigo-500/50'}`}
                title={isAdmin ? "管理员已登录" : "管理员登录"}
            >
                {isAdmin ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>}
            </button>
            {isAdmin && showUserMenu && (
              <div className="absolute right-0 top-12 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-right">
                <div className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-800">当前身份: 管理员</div>
                <button onClick={() => router.push('/admin')} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-sky-400 transition-colors flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>后台管理</button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-colors flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>退出登录</button>
              </div>
            )}
         </div>

         {activeSession ? (
            <>
                <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-sm z-10">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">{activeSession.name}<span className={`text-[10px] px-1.5 py-0.5 rounded border ${isAdmin ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{isAdmin ? 'Cloud' : 'Local'}</span></h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex -space-x-2">
                                {activeSession.participants?.map((p: any) => (<img key={p.id} src={p.avatar} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 object-cover" title={p.name} />))}
                            </div>
                            <button onClick={openAddMemberModal} className="w-5 h-5 rounded-full bg-slate-800 border border-dashed border-slate-500 flex items-center justify-center text-slate-400 hover:text-white hover:border-white text-xs transition" title="邀请新角色">+</button>
                        </div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
                    {messages.map((msg, idx) => {
                        if (idx > typingIndex) return null;
                        const isUser = msg.role === 'user'; const isTyping = idx === typingIndex && !isUser;
                        return (
                            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isUser && (<div className="flex flex-col items-center gap-1"><img src={msg.character?.avatar} className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700" /><span className="text-[10px] text-slate-500 max-w-[60px] truncate">{msg.character?.name}</span></div>)}
                                <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                    {isTyping ? <Typewriter text={msg.content} onComplete={() => setTypingIndex(prev => prev + 1)} /> : <MarkdownRenderer content={msg.content} />}
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

      {/* ✨✨✨ 新增：API 配置面板 ✨✨✨ */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowConfigModal(false)}>
            <div className="bg-slate-900 border border-slate-700 w-80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-700">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><span>⚙️ API 设置</span></h3>
                    <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">AI 对话服务 (本地会话专用)</label>
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                            <button onClick={() => updateConfig('apiSource', 'server')} className={`flex-1 py-1.5 text-xs rounded-md transition ${config.apiSource === 'server' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>网站默认</button>
                            <button onClick={() => updateConfig('apiSource', 'custom')} className={`flex-1 py-1.5 text-xs rounded-md transition ${config.apiSource === 'custom' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>自定义 API</button>
                        </div>
                    </div>
                    {config.apiSource === 'custom' && (
                        <div className="space-y-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800 animate-in slide-in-from-top-2">
                            <div><label className="text-[10px] text-slate-500 block mb-1">API Address (URL)</label><input value={config.customApiUrl} onChange={(e) => updateConfig('customApiUrl', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-indigo-500 outline-none" placeholder="https://api.openai.com/v1/chat/completions" /></div>
                            <div><label className="text-[10px] text-slate-500 block mb-1">API Key (Bearer)</label><input type="password" value={config.customApiKey} onChange={(e) => updateConfig('customApiKey', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-indigo-500 outline-none" placeholder="sk-..." /></div>
                            <div><label className="text-[10px] text-slate-500 block mb-1">Model Name</label><input value={config.customModel} onChange={(e) => updateConfig('customModel', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-indigo-500 outline-none" placeholder="gpt-3.5-turbo" /></div>
                        </div>
                    )}
                    <p className="text-[10px] text-slate-600 text-center">配置仅保存在本地浏览器中，仅对“本地会话”生效。</p>
                </div>
            </div>
        </div>
      )}

      {/* 角色/会话管理 Modal (保持不变) */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                 <h3 className="text-lg font-bold text-white mb-4">{editingCharId ? '编辑角色' : '创建角色'} <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : (editingCharId && typeof editingCharId === 'number' ? '云端·只读' : '本地')})</span></h3>
                 <div className="space-y-4 overflow-y-auto custom-scrollbar p-1">
                    <input placeholder="角色名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.name} onChange={e => setCharForm({...charForm, name: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <input placeholder="简短描述" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.desc} onChange={e => setCharForm({...charForm, desc: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <textarea placeholder="系统提示词..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-24" value={charForm.prompt} onChange={e => setCharForm({...charForm, prompt: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    <input placeholder="头像 URL (可选)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={charForm.avatar} onChange={e => setCharForm({...charForm, avatar: e.target.value})} disabled={!isAdmin && typeof editingCharId === 'number'} />
                    {isAdmin && (<label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-800"><input type="checkbox" checked={charForm.isPublic} onChange={e => setCharForm({...charForm, isPublic: e.target.checked})} className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500" /><span className="text-sm text-slate-300">设为公开角色 (游客可见)</span></label>)}
                </div>
                 <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800"><button onClick={() => setShowCharModal(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button>{!( !isAdmin && typeof editingCharId === 'number' ) && (<button onClick={handleSaveChar} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm shadow-lg shadow-emerald-500/20">{editingCharId ? '保存修改' : '创建角色'}</button>)}</div>
                 {!editingCharId && (
                     <div className="mt-4 pt-4 border-t border-slate-800 flex-1 overflow-y-auto custom-scrollbar min-h-[150px]"><p className="text-xs text-slate-500 mb-2">已有角色 (点击编辑)</p>{displayCharacters.map(c => (<div key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded group"><span className="text-xs text-slate-300 flex items-center gap-2"><img src={c.avatar} className="w-5 h-5 rounded-full bg-slate-700" />{c.name}{typeof c.id === 'number' && c.isPublic && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">公开</span>}</span><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">{(isAdmin || typeof c.id !== 'number') && <button onClick={() => openEditModal(c)} className="text-xs text-sky-400 hover:text-sky-300">编辑</button>}{(isAdmin || typeof c.id !== 'number') && <button onClick={() => handleDeleteChar(c.id)} className="text-xs text-slate-600 hover:text-red-400">删除</button>}</div></div>))}</div>
                 )}
             </div>
        </div>
      )}

      {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-4">创建新群聊 <span className="text-xs font-normal opacity-60">({isAdmin ? '云端' : '本地'})</span></h3>
                  <div className="space-y-4">
                        <input placeholder="群聊名称" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} />
                        <p className="text-xs text-slate-500">选择参与角色</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">{displayCharacters.map(c => (<label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(String(c.id)) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}><input type="checkbox" className="hidden" checked={selectedCharIds.includes(String(c.id))} onChange={e => { const sid = String(c.id); if(e.target.checked) setSelectedCharIds([...selectedCharIds, sid]); else setSelectedCharIds(selectedCharIds.filter(id => id !== sid)) }} /><img src={c.avatar} className="w-6 h-6 rounded-full" /><div className="overflow-hidden"><div className="text-xs text-slate-200 truncate">{c.name}</div>{typeof c.id === 'number' && <div className="text-[9px] text-blue-400">Cloud</div>}</div></label>))}</div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowSessionModal(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button><button onClick={handleCreateSession} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm shadow-lg shadow-indigo-500/20">开始群聊</button></div>
              </div>
          </div>
      )}

      {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-white mb-4">邀请角色入群</h3>
                  <div className="space-y-4">
                        <p className="text-xs text-slate-500">选择要邀请的角色</p>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {displayCharacters.filter(c => !activeSession?.participants?.some((p:any) => String(p.id) === String(c.id))).map(c => (
                                <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedCharIds.includes(String(c.id)) ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}><input type="checkbox" className="hidden" checked={selectedCharIds.includes(String(c.id))} onChange={e => { const sid = String(c.id); if(e.target.checked) setSelectedCharIds([...selectedCharIds, sid]); else setSelectedCharIds(selectedCharIds.filter(id => id !== sid)) }} /><img src={c.avatar} className="w-6 h-6 rounded-full" /><div className="overflow-hidden"><div className="text-xs text-slate-200 truncate">{c.name}</div></div></label>
                            ))}
                            {displayCharacters.filter(c => !activeSession?.participants?.some((p:any) => String(p.id) === String(c.id))).length === 0 && (<p className="col-span-2 text-center text-xs text-slate-600 py-4">没有更多可邀请的角色了</p>)}
                        </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowAddMemberModal(false); setSelectedCharIds([]); }} className="px-4 py-2 text-slate-400 text-sm hover:text-white">取消</button><button onClick={handleAddMembers} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm shadow-lg shadow-indigo-500/20">确认邀请</button></div>
              </div>
          </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAuthModal(false)}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-4">管理员登录</h3>
                <form action={handleLogin} className="space-y-4">
                    <div className="space-y-2"><input type="text" name="username" placeholder="用户名" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none text-sm placeholder:text-slate-500" /><input type="password" name="password" placeholder="密码" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none text-sm placeholder:text-slate-500" /></div>
                    {authError && <p className="text-xs text-red-400 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>{authError}</p>}
                    <div className="flex gap-2 justify-end pt-2"><button type="button" onClick={() => setShowAuthModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">取消</button><button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all">登录</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
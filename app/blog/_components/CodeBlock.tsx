// app/blog/_components/CodeBlock.tsx
'use client'

import { useState, useRef } from 'react'

export default function CodeBlock({ children, ...props }: any) {
  const [isCopied, setIsCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    // ... (保留之前的复制逻辑，不变) ...
    if (!preRef.current) return
    const text = preRef.current.innerText
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => { setIsCopied(false) }, 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden bg-[#0d1117] border border-white/10">
      {/* 复制按钮 (保留不变) */}
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 z-20 p-1.5 rounded-md border border-white/10 bg-black/50 backdrop-blur transition-all duration-200 
          ${isCopied ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
          opacity-0 group-hover:opacity-100 focus:opacity-100
        `}
        title="Copy code"
      >
        {isCopied ? (
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        ) : (
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
        )}
      </button>

      {/* ✨✨✨ 修改点在这里 ✨✨✨ 
         1. 添加 code-scrollbar 类
         2. 添加 overflow-x-auto 确保可以滚动
         3. 移除 !rounded-none (外层div已经圆角了，这里不用强行方角)
      */}
      <pre 
        ref={preRef} 
        {...props} 
        className="code-scrollbar overflow-x-auto !m-0 relative p-4 pt-10 font-mono text-sm leading-relaxed" 
      >
        {children}
      </pre>
    </div>
  )
}
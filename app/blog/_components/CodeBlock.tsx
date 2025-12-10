// app/blog/_components/CodeBlock.tsx
'use client'

import { useState, useRef } from 'react'

export default function CodeBlock({ children, ...props }: any) {
  const [isCopied, setIsCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    if (!preRef.current) return

    // 获取 pre 标签内的纯文本内容
    const text = preRef.current.innerText
    
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      
      // 2秒后恢复图标状态
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制')
    }
  }

  return (
    <div className="relative group">
      {/* 复制按钮 - 默认隐藏，hover时显示，或一直显示但淡化 */}
      <button
        onClick={handleCopy}
        className={`absolute top-3 right-3 z-10 p-2 rounded-lg border border-slate-700/50 bg-slate-800/80 backdrop-blur transition-all duration-200 
          ${isCopied ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
          opacity-0 group-hover:opacity-100 focus:opacity-100
        `}
        title="复制代码"
      >
        {isCopied ? (
          // ✅ 成功图标 (Check)
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        ) : (
          // 📋 复制图标 (Clipboard)
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
        )}
      </button>

      {/* 原始的 pre 标签渲染 */}
      <pre 
        ref={preRef} 
        {...props} 
        className="relative" // 确保没有多余的 overflow 遮挡按钮，虽然父级div处理了
      >
        {children}
      </pre>
    </div>
  )
}
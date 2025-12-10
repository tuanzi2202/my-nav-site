// app/notes/page.tsx
import { getNotes } from '../actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// 颜色映射配置
const colorStyles: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 shadow-yellow-500/20',
  pink:   'bg-pink-200 text-pink-900 shadow-pink-500/20',
  blue:   'bg-sky-200 text-sky-900 shadow-sky-500/20',
  green:  'bg-emerald-200 text-emerald-900 shadow-emerald-500/20',
  purple: 'bg-purple-200 text-purple-900 shadow-purple-500/20',
}

export default async function NotesPage() {
  const notes = await getNotes()

  return (
    <div className="min-h-screen bg-[#0f172a] p-8 font-sans selection:bg-black/10">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <header className="mb-12 flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
              Sticky Wall
            </h1>
            <p className="text-xs text-slate-500 mt-2">灵感碎片与备忘录</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm text-slate-300">
            ← 返回导航
          </Link>
        </header>

        {/* 墙面区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 auto-rows-max">
          {notes.map((note, index) => (
            <div 
              key={note.id} 
              className={`
                relative p-6 min-h-[200px] flex flex-col shadow-xl transition-transform duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl
                ${colorStyles[note.color] || colorStyles.yellow}
                ${index % 2 === 0 ? '-rotate-1' : 'rotate-1'} 
              `}
              // 模拟手工粘贴的随机微调效果
              style={{ transform: `rotate(${Math.random() * 4 - 2}deg)` }}
            >
              {/* 钉子效果 */}
              <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner"></div>
              
              <div className="flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting">
                {note.content}
              </div>
              
              <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center opacity-60 text-xs font-mono">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                <span>#{note.id}</span>
              </div>
            </div>
          ))}

          {/* 空状态提示 */}
          {notes.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
              <p className="text-slate-500">墙上空空如也。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
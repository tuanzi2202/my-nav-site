// app/notes/page.tsx
import { getNotes } from '../actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-[#0f172a] p-8 font-sans selection:bg-black/10 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12 auto-rows-max px-4">
          {notes.map((note) => {
            // ✨ 随机生成动画参数，打破同步感
            // 时长：3s ~ 6s 之间
            const duration = 3 + Math.random() * 3
            // 延迟：0s ~ 2s 之间 (负数延迟可以让动画直接处于中间状态，避免同时开始)
            const delay = -Math.random() * 2 
            
            return (
              <div 
                key={note.id} 
                className={`
                  relative p-6 min-h-[200px] flex flex-col shadow-xl 
                  ${colorStyles[note.color] || colorStyles.yellow}
                  animate-note-sway hover:[animation-play-state:paused] cursor-pointer
                  transition-all duration-300 hover:scale-110 hover:z-50 hover:shadow-2xl
                `}
                style={{ 
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`
                }}
              >
                {/* 钉子效果 */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black/20 backdrop-blur shadow-inner z-10"></div>
                {/* 钉子高光 */}
                <div className="absolute top-[-8px] left-[calc(50%-2px)] w-1.5 h-1.5 rounded-full bg-white/30 z-20"></div>

                <div className="flex-1 whitespace-pre-wrap leading-relaxed font-medium font-handwriting select-none">
                  {note.content}
                </div>
                
                <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center opacity-60 text-xs font-mono">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  <span>#{note.id}</span>
                </div>
              </div>
            )
          })}

          {notes.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
              <p className="text-slate-500">墙上空空如也，去后台贴一张吧。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
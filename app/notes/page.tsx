// app/notes/page.tsx
import { getNotes, checkAuth, getNotesBgSettings } from '../actions' // ✨ 引入 getNotesBgSettings
import NotesWallClient from './client'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  // 并行获取数据
  const [notes, isAdmin, bgSettings] = await Promise.all([
    getNotes(),
    checkAuth(),
    getNotesBgSettings()
  ])

  return (
    // 移除外层的 bg-[#0f172a]，样式完全由 client 组件接管
    <div className="min-h-screen font-sans selection:bg-black/10 overflow-hidden">
      <NotesWallClient 
        initialNotes={notes} 
        initialIsAdmin={isAdmin} 
        initialBgSettings={bgSettings} // ✨ 传递配置
      />
    </div>
  )
}
// app/notes/page.tsx
import { getNotes, checkAuth } from '../actions' // ✨ 引入 checkAuth
import NotesWallClient from './client'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const notes = await getNotes()
  const isAdmin = await checkAuth() // ✨ 服务端检查是否已登录

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans selection:bg-black/10 overflow-hidden">
      {/* ✨ 将登录状态传给 Client 组件 */}
      <NotesWallClient initialNotes={notes} initialIsAdmin={isAdmin} />
    </div>
  )
}
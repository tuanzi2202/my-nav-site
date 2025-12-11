import { getNotes } from '../actions'
import NotesWallClient from './client'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const notes = await getNotes()

  return (
    // 移除默认的 p-8 padding，让 client 组件全权接管布局，方便计算坐标
    <div className="min-h-screen bg-[#0f172a] font-sans selection:bg-black/10 overflow-hidden">
      <NotesWallClient initialNotes={notes} />
    </div>
  )
}
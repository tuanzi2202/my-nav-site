// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
import { getLinkData, getAnnouncement, getSmartWallpapers, getUISettings, getAnnouncementHistory, getAllPosts, getNotes } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  // 并行获取所有数据，包括 notes
  const [links, announcement, smartThemes, uiSettings, announcementHistory, posts, notes] = await Promise.all([
    getLinkData(),
    getAnnouncement(),
    getSmartWallpapers(),
    getUISettings(),
    getAnnouncementHistory(),
    getAllPosts(),
    getNotes() // ✨ 获取便利贴数据
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="w-full mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement}
            initialThemes={smartThemes}
            initialGlobalSettings={uiSettings}
            initialHistory={announcementHistory}
            initialPosts={posts}
            initialNotes={notes} // ✨ 注入便利贴数据
        />
      </div>
    </div>
  )
}
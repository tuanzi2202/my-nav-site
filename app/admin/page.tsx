import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
import { getLinkData, getAnnouncement, getSmartWallpapers, getUISettings, getAnnouncementHistory, getAllPosts } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  // 🧹 移除了 getNotes()
  const [links, announcement, smartThemes, uiSettings, announcementHistory, posts] = await Promise.all([
    getLinkData(),
    getAnnouncement(),
    getSmartWallpapers(),
    getUISettings(),
    getAnnouncementHistory(),
    getAllPosts(),
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
            // 🧹 initialNotes 属性已移除
        />
      </div>
    </div>
  )
}
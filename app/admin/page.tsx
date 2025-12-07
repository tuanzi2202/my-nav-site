// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
// ✨ 引入 getAnnouncementHistory
import { getAnnouncement, getSmartWallpapers, getUISettings, getAnnouncementHistory } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  const [links, announcement, smartThemes, uiSettings, announcementHistory] = await Promise.all([
    prisma.link.findMany({ orderBy: { createdAt: 'desc' } }),
    getAnnouncement(),
    getSmartWallpapers(),
    getUISettings(),
    getAnnouncementHistory() // ✨ 获取历史记录
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement}
            initialThemes={smartThemes}
            initialGlobalSettings={uiSettings}
            initialHistory={announcementHistory} // ✨ 传递给 Client
        />
      </div>
    </div>
  )
}
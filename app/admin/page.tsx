// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
import { getLinkData, getAnnouncement, getSmartWallpapers, getUISettings, getAnnouncementHistory, getAllPosts } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  const [links, announcement, smartThemes, uiSettings, announcementHistory, posts] = await Promise.all([
    getLinkData(),
    getAnnouncement(),
    getSmartWallpapers(),
    getUISettings(),
    getAnnouncementHistory(),
    getAllPosts()
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      {/* 👇👇👇 修改这里：去掉 max-w-5xl，改为 w-full 👇👇👇 */}
      <div className="w-full mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement}
            initialThemes={smartThemes}
            initialGlobalSettings={uiSettings}
            initialHistory={announcementHistory}
            initialPosts={posts}
        />
      </div>
    </div>
  )
}
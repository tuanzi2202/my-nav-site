// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
// ✨ 引入 getUISettings
import { getAnnouncement, getSmartWallpapers, getUISettings } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  const [links, announcement, smartThemes, uiSettings] = await Promise.all([
    prisma.link.findMany({ orderBy: { createdAt: 'desc' } }),
    getAnnouncement(),
    getSmartWallpapers(),
    getUISettings() // ✨ 获取当前数据库里的 UI 配置
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement}
            initialThemes={smartThemes}
            initialGlobalSettings={uiSettings} // ✨ 传给 Client
        />
      </div>
    </div>
  )
}
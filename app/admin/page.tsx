// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
import { getAnnouncement, getSmartWallpapers } from '../actions' // ✨

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  const [links, announcement, smartThemes] = await Promise.all([
    prisma.link.findMany({ orderBy: { createdAt: 'desc' } }),
    getAnnouncement(),
    getSmartWallpapers() // ✨ 获取所有智能主题
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement}
            initialThemes={smartThemes} // ✨ 传递给 Client
        />
      </div>
    </div>
  )
}
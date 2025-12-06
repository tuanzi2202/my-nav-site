// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client'
// ✨ 引入获取公告的方法
import { getAnnouncement } from '../actions'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  // 并行获取数据
  const [links, announcement] = await Promise.all([
    prisma.link.findMany({ orderBy: { createdAt: 'desc' } }),
    getAnnouncement() // ✨ 获取公告
  ])

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        <AdminClient 
            initialLinks={links} 
            initialAnnouncement={announcement} // ✨ 传递给客户端
        />
      </div>
    </div>
  )
}
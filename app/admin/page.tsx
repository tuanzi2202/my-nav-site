// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import AdminClient from './client' // 引入刚才写的客户端组件

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  // 服务端只负责一次性获取所有数据
  // 过滤和编辑都交给客户端处理，体验更丝滑
  let links: any[] = []
  
  try {
    links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (e) {
    console.error("Admin DB Error:", e)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 将数据传递给客户端组件 */}
        <AdminClient initialLinks={links} />
      </div>
    </div>
  )
}
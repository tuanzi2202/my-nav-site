// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import { addLink, deleteLink } from '../actions' // 引入刚才写的 Server Actions

// 必须动态渲染，保证数据最新
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  const links = await prisma.link.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-sky-400">后台管理面板</h1>
          <a href="/" className="text-sm text-slate-400 hover:text-white transition">← 返回首页</a>
        </header>

        {/* 添加表单 */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-10 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">添加新链接</h2>
          <form action={addLink} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="title" placeholder="网站标题 (e.g. ChatGPT)" required className="bg-slate-800 border border-slate-700 p-3 rounded text-white focus:outline-none focus:border-sky-500 transition" />
              <input name="url" placeholder="网址 (e.g. https://openai.com)" required className="bg-slate-800 border border-slate-700 p-3 rounded text-white focus:outline-none focus:border-sky-500 transition" />
              <input name="category" placeholder="分类 (默认: General)" className="bg-slate-800 border border-slate-700 p-3 rounded text-white focus:outline-none focus:border-sky-500 transition" />
            </div>
            <textarea name="description" placeholder="简介描述..." className="w-full bg-slate-800 border border-slate-700 p-3 rounded text-white focus:outline-none focus:border-sky-500 transition h-24" />
            
            <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded font-medium transition w-full md:w-auto">
              提交数据
            </button>
          </form>
        </div>

        {/* 数据列表 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 text-sm uppercase">
              <tr>
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">标题</th>
                <th className="p-4 font-medium">URL</th>
                <th className="p-4 font-medium">分类</th>
                <th className="p-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 text-slate-500 text-sm">#{link.id}</td>
                  <td className="p-4 font-medium">{link.title}</td>
                  <td className="p-4 text-slate-400 text-sm truncate max-w-[200px]">{link.url}</td>
                  <td className="p-4">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">
                      {link.category}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form action={deleteLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300 text-sm bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 transition">
                        删除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {links.length === 0 && (
            <div className="p-8 text-center text-slate-500">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  )
}
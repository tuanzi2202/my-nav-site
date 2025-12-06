// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import { addLink, deleteLink } from '../actions'

// 1. 强制动态渲染 (防止缓存导致数据不刷新)
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export default async function AdminPage() {
  let links = []
  let errorMsg = ''

  try {
    // 2. 尝试获取数据
    links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (e: any) {
    console.error("Admin DB Error:", e)
    // 捕获错误，防止页面直接崩溃
    errorMsg = "连接数据库失败，请检查网络或环境变量。"
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* 顶部导航 */}
        <header className="flex justify-between items-center mb-10 border-b border-slate-800/60 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
              控制台
            </h1>
            <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
          </div>
          <a 
            href="/" 
            className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition border border-slate-700 hover:border-sky-500/30"
          >
            ← 返回前台
          </a>
        </header>

        {/* 错误提示条 (只有报错时才会显示) */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            {errorMsg}
          </div>
        )}

        {/* 添加表单区 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mb-10 shadow-xl">
          <h2 className="text-lg font-semibold mb-5 text-slate-100 flex items-center gap-2">
            <span className="w-1 h-5 bg-sky-500 rounded-full"></span>
            添加新资源
          </h2>
          <form action={addLink} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">标题</label>
                <input name="title" placeholder="例如: GitHub" required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">链接</label>
                <input name="url" placeholder="https://..." required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">分类</label>
                <input name="category" placeholder="默认: General" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">操作</label>
                <button type="submit" className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-sky-900/20 transition transform active:scale-95">
                  提交数据
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 ml-1">描述</label>
              <textarea name="description" placeholder="一句话简介..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition h-20 resize-none" />
            </div>
          </form>
        </div>

        {/* 数据列表区 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-5 font-medium border-b border-slate-800">ID</th>
                <th className="p-5 font-medium border-b border-slate-800">标题 & URL</th>
                <th className="p-5 font-medium border-b border-slate-800">分类</th>
                <th className="p-5 font-medium border-b border-slate-800 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {links.map((link: any) => (
                <tr key={link.id} className="hover:bg-slate-800/30 transition group">
                  <td className="p-5 text-slate-600 text-sm font-mono">#{link.id}</td>
                  <td className="p-5">
                    <div className="font-medium text-slate-200 group-hover:text-sky-400 transition">{link.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px] mt-1 font-mono opacity-60">{link.url}</div>
                  </td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {link.category}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <form action={deleteLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <button 
                        type="submit" 
                        className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1 ml-auto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        删除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {links.length === 0 && !errorMsg && (
            <div className="p-12 text-center text-slate-500 border-t border-slate-800/50">
              暂无数据，快去添加第一条吧！
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
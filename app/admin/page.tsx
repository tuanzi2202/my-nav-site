// app/admin/page.tsx
import { PrismaClient } from '@prisma/client'
import { addLink, deleteLink, updateLink } from '../actions' // 引入 updateLink
import Link from 'next/link' // 引入 Link 组件用于跳转

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// 定义页面接收的参数类型
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminPage(props: Props) {
  const searchParams = await props.searchParams
  
  // 1. 获取 editId 参数
  const editId = typeof searchParams.editId === 'string' ? parseInt(searchParams.editId) : null

  // 2. 并行获取：列表数据 + (如果是编辑模式)当前要编辑的数据
  const [links, editingLink] = await Promise.all([
    prisma.link.findMany({ orderBy: { createdAt: 'desc' } }),
    editId ? prisma.link.findUnique({ where: { id: editId } }) : null
  ])

  // 3. 判断当前模式
  const isEditMode = !!editingLink

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

        {/* === 表单区域 (复用：既是添加也是编辑) === 
            根据 isEditMode 切换 action 和默认值
        */}
        <div className={`bg-slate-900/50 backdrop-blur-sm border ${isEditMode ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-slate-800/60'} rounded-2xl p-6 mb-10 shadow-xl transition-all`}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <span className={`w-1 h-5 rounded-full ${isEditMode ? 'bg-orange-500' : 'bg-sky-500'}`}></span>
              {isEditMode ? '编辑资源' : '添加新资源'}
            </h2>
            {isEditMode && (
              <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-300">
                取消编辑 ✕
              </Link>
            )}
          </div>

          <form action={isEditMode ? updateLink : addLink} className="space-y-5">
            {/* 如果是编辑模式，需要传递 ID */}
            {isEditMode && <input type="hidden" name="id" value={editingLink.id} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">标题</label>
                <input 
                  name="title" 
                  defaultValue={editingLink?.title || ''} // 填充旧数据
                  placeholder="例如: GitHub" 
                  required 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">链接</label>
                <input 
                  name="url" 
                  defaultValue={editingLink?.url || ''} 
                  placeholder="https://..." 
                  required 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">分类</label>
                <input 
                  name="category" 
                  defaultValue={editingLink?.category || ''} 
                  placeholder="默认: General" 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">操作</label>
                <button 
                  type="submit" 
                  className={`w-full text-white p-3 rounded-xl font-medium shadow-lg transition transform active:scale-95 ${
                    isEditMode 
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-900/20' 
                      : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-900/20'
                  }`}
                >
                  {isEditMode ? '保存修改' : '提交数据'}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 ml-1">描述</label>
              <textarea 
                name="description" 
                defaultValue={editingLink?.description || ''} 
                placeholder="一句话简介..." 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition h-20 resize-none" 
              />
            </div>
          </form>
        </div>

        {/* 数据列表区 */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-5 font-medium border-b border-slate-800">ID</th>
                <th className="p-5 font-medium border-b border-slate-800">信息</th>
                <th className="p-5 font-medium border-b border-slate-800">分类</th>
                <th className="p-5 font-medium border-b border-slate-800 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {links.map((link: any) => (
                <tr key={link.id} className={`transition group ${editingLink?.id === link.id ? 'bg-sky-900/20' : 'hover:bg-slate-800/30'}`}>
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
                    <div className="flex justify-end gap-2">
                      {/* ✨ 编辑按钮：跳转到带参数的 URL */}
                      <Link 
                        href={`/admin?editId=${link.id}`}
                        scroll={false} // 防止页面滚动到顶部
                        className="text-slate-500 hover:text-sky-400 hover:bg-sky-900/10 px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        编辑
                      </Link>

                      <form action={deleteLink}>
                        <input type="hidden" name="id" value={link.id} />
                        <button 
                          type="submit" 
                          className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {links.length === 0 && (
            <div className="p-12 text-center text-slate-500 border-t border-slate-800/50">
              暂无数据
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// app/admin/client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLink, deleteLink, updateLink } from '../actions'

// 定义数据类型
type LinkItem = {
  id: number
  title: string
  url: string
  description: string | null
  category: string
  createdAt: Date
}

export default function AdminClient({ initialLinks }: { initialLinks: LinkItem[] }) {
  const router = useRouter()
  
  // 状态管理
  const [links, setLinks] = useState(initialLinks) // 虽然是服务端传来的，但为了乐观更新或搜索，也可以存state，这里直接用props渲染即可，search单独处理
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null) // 控制弹窗

  // 搜索过滤逻辑
  const filteredLinks = initialLinks.filter(link => {
    const q = searchQuery.toLowerCase()
    return (
      link.title.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      (link.description && link.description.toLowerCase().includes(q))
    )
  })

  // 处理添加 (包装 Server Action 以重置表单)
  async function handleAdd(formData: FormData) {
    await addLink(formData)
    // 强制清除表单内容 (DOM操作)
    const form = document.getElementById('add-form') as HTMLFormElement
    if (form) form.reset()
  }

  // 处理更新 (包装 Server Action 以关闭弹窗)
  async function handleUpdate(formData: FormData) {
    await updateLink(formData)
    setEditingLink(null) // 关闭弹窗
  }

  return (
    <div>
      {/* 顶部导航 & 搜索 */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            控制台
          </h1>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="relative group flex-1 md:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="实时筛选..." 
                  className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-sky-500 transition-all placeholder-slate-600 text-slate-200"
              />
           </div>
           <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition border border-slate-700 flex items-center whitespace-nowrap">
              ← 返回前台
           </a>
        </div>
      </header>

      {/* 添加新资源表单 (常驻顶部) */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mb-10 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-5">
          <span className="w-1 h-5 rounded-full bg-sky-500"></span>
          添加新资源
        </h2>
        <form id="add-form" action={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 ml-1">标题</label>
              <input name="title" placeholder="例如: GitHub" required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 ml-1">链接</label>
              <input name="url" placeholder="https://..." required className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 ml-1">分类</label>
              <input name="category" placeholder="默认: General" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition" />
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
            <textarea name="description" placeholder="一句话简介..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-sky-500 transition h-20 resize-none" />
          </div>
        </form>
      </div>

      {/* 数据列表 */}
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
            {filteredLinks.map((link) => (
              <tr key={link.id} className="hover:bg-slate-800/30 transition">
                <td className="p-5 text-slate-600 text-sm font-mono">#{link.id}</td>
                <td className="p-5">
                  <div className="font-medium text-slate-200">{link.title}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[200px] mt-1 font-mono opacity-60">{link.url}</div>
                </td>
                <td className="p-5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {link.category}
                  </span>
                </td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-2">
                    {/* ✨ 编辑按钮：不再跳转链接，而是设置状态 ✨ */}
                    <button 
                      onClick={() => setEditingLink(link)}
                      className="text-slate-500 hover:text-sky-400 hover:bg-sky-900/10 px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      编辑
                    </button>

                    <form action={deleteLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <button type="submit" className="text-slate-500 hover:text-red-400 hover:bg-red-900/10 px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1">
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
        {filteredLinks.length === 0 && (
          <div className="p-12 text-center text-slate-500 border-t border-slate-800/50">
            暂无数据
          </div>
        )}
      </div>

      {/* ✨ 编辑弹窗 (Modal) ✨ */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">编辑资源</h2>
              <button onClick={() => setEditingLink(null)} className="text-slate-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form action={handleUpdate} className="p-6 space-y-5">
              <input type="hidden" name="id" value={editingLink.id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 ml-1">标题</label>
                  <input name="title" defaultValue={editingLink.title} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 ml-1">链接</label>
                  <input name="url" defaultValue={editingLink.url} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 ml-1">分类</label>
                  <input name="category" defaultValue={editingLink.category} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">描述</label>
                <textarea name="description" defaultValue={editingLink.description || ''} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition h-24 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingLink(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition">
                  取消
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-lg shadow-sky-900/20 transition">
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
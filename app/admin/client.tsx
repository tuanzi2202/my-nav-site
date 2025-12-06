// app/admin/client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLink, deleteLink, updateLink } from '../actions'

// 更新类型定义
type LinkItem = {
  id: number
  title: string
  url: string
  description: string | null
  category: string
  isRecommended: boolean // ✨ 新增类型
  createdAt: Date
}

export default function AdminClient({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)

  const filteredLinks = initialLinks.filter(link => {
    const q = searchQuery.toLowerCase()
    return (
      link.title.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      (link.description && link.description.toLowerCase().includes(q))
    )
  })

  async function handleAdd(formData: FormData) {
    await addLink(formData)
    const form = document.getElementById('add-form') as HTMLFormElement
    if (form) form.reset()
  }

  async function handleUpdate(formData: FormData) {
    await updateLink(formData)
    setEditingLink(null)
  }

  return (
    <div>
      {/* Header & Search ... (保持不变，省略以节省空间，请保留原有的 Header 代码) */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <div className="relative group flex-1 md:flex-none">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="实时筛选..." className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-2 text-sm focus:outline-none focus:border-sky-500 transition-all text-slate-200" />
           </div>
           <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition border border-slate-700 flex items-center">← 返回前台</a>
        </div>
      </header>

      {/* 添加表单 */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mb-10 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-100 mb-5">添加新资源</h2>
        <form id="add-form" action={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input name="title" placeholder="标题" required className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200" />
            <input name="url" placeholder="链接" required className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200" />
            <input name="category" placeholder="分类" className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200" />
            
            {/* ✨ 新增推荐开关 ✨ */}
            <div className="flex items-center space-x-3 bg-slate-800/30 border border-slate-700 rounded-xl px-4">
                <input type="checkbox" id="isRec" name="isRecommended" className="w-5 h-5 accent-sky-500" />
                <label htmlFor="isRec" className="text-sm text-slate-300 cursor-pointer select-none">设为推荐 (默认显示)</label>
            </div>
          </div>
          <textarea name="description" placeholder="描述..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 h-20" />
          <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl font-medium">提交数据</button>
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="p-5">ID</th>
              <th className="p-5">标题</th>
              <th className="p-5">状态</th>
              <th className="p-5 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredLinks.map((link) => (
              <tr key={link.id} className="hover:bg-slate-800/30">
                <td className="p-5 text-slate-500">#{link.id}</td>
                <td className="p-5 text-slate-200">{link.title}</td>
                <td className="p-5">
                    {/* 显示推荐徽章 */}
                    {link.isRecommended && <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded">推荐</span>}
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded ml-2">{link.category}</span>
                </td>
                <td className="p-5 text-right">
                  <button onClick={() => setEditingLink(link)} className="text-sky-400 hover:text-sky-300 mr-4">编辑</button>
                  <form action={deleteLink} className="inline"><input type="hidden" name="id" value={link.id} /><button className="text-red-400 hover:text-red-300">删除</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">编辑资源</h2>
            <form action={handleUpdate} className="space-y-5">
              <input type="hidden" name="id" value={editingLink.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input name="title" defaultValue={editingLink.title} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                <input name="url" defaultValue={editingLink.url} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                <input name="category" defaultValue={editingLink.category} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
                
                {/* ✨ 编辑时的推荐开关 ✨ */}
                <div className="flex items-center space-x-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4">
                    <input type="checkbox" id="editIsRec" name="isRecommended" defaultChecked={editingLink.isRecommended} className="w-5 h-5 accent-sky-500" />
                    <label htmlFor="editIsRec" className="text-sm text-slate-300 cursor-pointer">设为推荐</label>
                </div>
              </div>
              <textarea name="description" defaultValue={editingLink.description || ''} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white h-24" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingLink(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800">取消</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
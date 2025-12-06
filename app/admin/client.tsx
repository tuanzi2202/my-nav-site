// app/admin/client.tsx
'use client'

import { useState, useMemo } from 'react' // 引入 useMemo 优化性能
import { useRouter } from 'next/navigation'
import { addLink, deleteLink, updateLink } from '../actions'

// 类型定义
type LinkItem = {
  id: number
  title: string
  url: string
  description: string | null
  category: string
  isRecommended: boolean
  createdAt: Date
}

export default function AdminClient({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  
  // ✨ 新增：分类筛选状态，默认为 'All'
  const [filterCategory, setFilterCategory] = useState('All')

  // ✨ 自动计算所有存在的分类 (去重)
  const allCategories = useMemo(() => {
    const cats = new Set(initialLinks.map(link => link.category))
    return ['All', ...Array.from(cats)]
  }, [initialLinks])

  // ✨ 核心逻辑：双重过滤 (搜索 + 分类)
  const filteredLinks = initialLinks.filter(link => {
    const q = searchQuery.toLowerCase()
    
    // 1. 匹配搜索词
    const matchesSearch = 
      link.title.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      (link.description && link.description.toLowerCase().includes(q))

    // 2. 匹配分类
    const matchesCategory = filterCategory === 'All' || link.category === filterCategory

    return matchesSearch && matchesCategory
  })

  // 处理添加
  async function handleAdd(formData: FormData) {
    await addLink(formData)
    const form = document.getElementById('add-form') as HTMLFormElement
    if (form) form.reset()
  }

  // 处理更新
  async function handleUpdate(formData: FormData) {
    await updateLink(formData)
    setEditingLink(null)
  }

  return (
    <div>
      {/* 顶部导航 & 工具栏 */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            控制台
          </h1>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           
           {/* ✨ 新增：分类筛选下拉框 ✨ */}
           <div className="relative">
             <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full md:w-40 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-sky-500 text-slate-200 appearance-none cursor-pointer hover:bg-slate-800 transition"
             >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? '全部分类' : cat}
                  </option>
                ))}
             </select>
             {/* 自定义下拉箭头图标 */}
             <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
           </div>

           {/* 搜索框 */}
           <div className="relative group flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索资源..." 
                  className="w-full md:w-64 bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-sky-500 text-slate-200 placeholder-slate-600"
              />
           </div>

           <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 flex items-center justify-center whitespace-nowrap">
              ← 前台
           </a>
        </div>
      </header>

      {/* 添加表单 */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mb-10 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-100 mb-5">添加新资源</h2>
        <form id="add-form" action={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input name="title" placeholder="标题" required className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:border-sky-500 outline-none transition" />
            <input name="url" placeholder="链接" required className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:border-sky-500 outline-none transition" />
            <input name="category" placeholder="分类" className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:border-sky-500 outline-none transition" />
            <div className="flex items-center space-x-3 bg-slate-800/30 border border-slate-700 rounded-xl px-4">
                <input type="checkbox" id="isRec" name="isRecommended" className="w-5 h-5 accent-sky-500" />
                <label htmlFor="isRec" className="text-sm text-slate-300 cursor-pointer select-none">设为推荐</label>
            </div>
          </div>
          <textarea name="description" placeholder="描述..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:border-sky-500 outline-none transition h-20 resize-none" />
          <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-sky-900/20">提交数据</button>
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 text-xs text-slate-500 flex justify-between">
            <span>当前列表: {filteredLinks.length} 个资源</span>
            {filterCategory !== 'All' && <span className="text-sky-400">正在显示分类: {filterCategory}</span>}
        </div>
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
              <tr key={link.id} className="hover:bg-slate-800/30 transition">
                <td className="p-5 text-slate-500 text-sm font-mono">#{link.id}</td>
                <td className="p-5">
                    <div className="text-slate-200 font-medium">{link.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px] opacity-60">{link.url}</div>
                </td>
                <td className="p-5">
                    {link.isRecommended && <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded border border-sky-500/20">推荐</span>}
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded ml-2 border border-slate-700">{link.category}</span>
                </td>
                <td className="p-5 text-right">
                  <button onClick={() => setEditingLink(link)} className="text-slate-400 hover:text-sky-400 mr-4 transition">编辑</button>
                  <form action={deleteLink} className="inline"><input type="hidden" name="id" value={link.id} /><button className="text-slate-400 hover:text-red-400 transition">删除</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLinks.length === 0 && (
            <div className="p-12 text-center text-slate-500">
                {searchQuery || filterCategory !== 'All' ? '没有找到匹配的资源' : '暂无数据'}
            </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">编辑资源</h2>
                <button onClick={() => setEditingLink(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form action={handleUpdate} className="space-y-5">
              <input type="hidden" name="id" value={editingLink.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 ml-1">标题</label>
                    <input name="title" defaultValue={editingLink.title} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none transition" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 ml-1">链接</label>
                    <input name="url" defaultValue={editingLink.url} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none transition" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 ml-1">分类</label>
                    <input name="category" defaultValue={editingLink.category} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none transition" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 ml-1">设置</label>
                    <div className="flex items-center space-x-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 h-[50px]">
                        <input type="checkbox" id="editIsRec" name="isRecommended" defaultChecked={editingLink.isRecommended} className="w-5 h-5 accent-sky-500" />
                        <label htmlFor="editIsRec" className="text-sm text-slate-300 cursor-pointer">设为推荐</label>
                    </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 ml-1">描述</label>
                <textarea name="description" defaultValue={editingLink.description || ''} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 outline-none transition h-24 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingLink(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition">取消</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20 transition">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
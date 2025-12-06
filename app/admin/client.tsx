// app/admin/client.tsx
'use client'

import { useState, useEffect } from 'react'
import { addLink, deleteLink, updateLink, getCategories, syncCategories, updateCategoryOrder, deleteCategoryConfig } from '../actions'

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

type CategoryItem = {
  id: number
  name: string
  sortOrder: number
}

export default function AdminClient({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [activeTab, setActiveTab] = useState<'links' | 'categories'>('links') // ✨ Tab 切换
  const [categories, setCategories] = useState<CategoryItem[]>([]) // 存储分类配置
  
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')

  // 初始化加载分类配置
  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const data = await getCategories()
    setCategories(data)
  }

  async function handleSync() {
    await syncCategories()
    await loadCategories() // 刷新列表
  }

  // --- 链接管理逻辑 (保持不变) ---
  // 计算分类用于下拉框 (这里混合了 Link 里的分类和 DB 配置的分类)
  const categoryOptions = Array.from(new Set([...initialLinks.map(l => l.category), ...categories.map(c => c.name)]))

  const filteredLinks = initialLinks.filter(link => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q)
    const matchesCategory = filterCategory === 'All' || link.category === filterCategory
    return matchesSearch && matchesCategory
  })

  async function handleAdd(formData: FormData) {
    await addLink(formData)
    const form = document.getElementById('add-form') as HTMLFormElement
    if (form) form.reset()
    loadCategories() // 刷新分类，因为可能添加了新分类
  }

  async function handleUpdate(formData: FormData) {
    await updateLink(formData)
    setEditingLink(null)
    loadCategories()
  }

  // --- 渲染 ---
  return (
    <div>
      {/* 顶部 Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        
        {/* Tab 切换按钮 */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button 
                onClick={() => setActiveTab('links')}
                className={`px-4 py-2 text-sm rounded-md transition ${activeTab === 'links' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
                资源管理
            </button>
            <button 
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 text-sm rounded-md transition ${activeTab === 'categories' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
                分类排序
            </button>
        </div>

        <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">← 前台</a>
      </header>

      {/* ==================== 选项卡 A: 资源管理 ==================== */}
      {activeTab === 'links' && (
        <>
          {/* 工具栏 */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
             <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200">
                <option value="All">全部分类</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索资源..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200" />
          </div>

          {/* 添加表单 */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">添加新资源</h2>
            <form id="add-form" action={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="title" placeholder="标题" required className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <input name="url" placeholder="链接" required className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <input name="category" placeholder="分类" className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <div className="flex items-center px-4 border border-slate-700 rounded-xl bg-slate-800/30">
                    <input type="checkbox" id="isRec" name="isRecommended" className="w-5 h-5 accent-sky-500" />
                    <label htmlFor="isRec" className="ml-3 text-sm text-slate-300">设为推荐</label>
                </div>
              </div>
              <textarea name="description" placeholder="描述..." className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200 h-20" />
              <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl">提交</button>
            </form>
          </div>

          {/* 列表 */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-xs">
                <tr><th className="p-4">标题</th><th className="p-4">分类</th><th className="p-4 text-right">管理</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-800/30">
                    <td className="p-4 text-slate-200">{link.title}</td>
                    <td className="p-4">
                        {link.isRecommended && <span className="text-xs bg-sky-900 text-sky-300 px-1 rounded mr-1">荐</span>}
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{link.category}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setEditingLink(link)} className="text-sky-400 mr-3">编辑</button>
                      <form action={deleteLink} className="inline"><input type="hidden" name="id" value={link.id} /><button className="text-red-400">删除</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ==================== 选项卡 B: 分类排序 ==================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded-xl border border-blue-900/50">
                <div>
                    <h3 className="text-blue-200 font-bold">分类同步</h3>
                    <p className="text-xs text-blue-400 mt-1">如果有新添加的分类未显示在下方，请点击同步。</p>
                </div>
                <form action={handleSync}>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition">一键同步</button>
                </form>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="p-5 w-20">排序权重</th>
                            <th className="p-5">分类名称</th>
                            <th className="p-5 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-800/30">
                                <td className="p-5">
                                    {/* 直接在表格里修改权重 */}
                                    <form action={async (fd) => { await updateCategoryOrder(fd); loadCategories(); }} className="flex items-center">
                                        <input type="hidden" name="id" value={cat.id} />
                                        <input 
                                            name="sortOrder" 
                                            defaultValue={cat.sortOrder} 
                                            className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-white focus:border-sky-500 outline-none"
                                            onBlur={(e) => e.target.form?.requestSubmit()} // 失去焦点自动提交
                                        />
                                    </form>
                                </td>
                                <td className="p-5 font-medium text-slate-200">
                                    {cat.name}
                                    <span className="text-xs text-slate-500 ml-2 font-normal">(数字越大越靠前)</span>
                                </td>
                                <td className="p-5 text-right">
                                    <form action={async (fd) => { await deleteCategoryConfig(fd); loadCategories(); }}>
                                        <input type="hidden" name="id" value={cat.id} />
                                        <button className="text-xs text-slate-500 hover:text-red-400">清除配置</button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr><td colSpan={3} className="p-8 text-center text-slate-500">暂无配置，请点击上方“一键同步”</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* 编辑弹窗 (复用) */}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">编辑资源</h2>
            <form action={handleUpdate} className="space-y-5">
              <input type="hidden" name="id" value={editingLink.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input name="title" defaultValue={editingLink.title} className="bg-slate-800 border-slate-700 rounded-xl p-3 text-white" />
                <input name="url" defaultValue={editingLink.url} className="bg-slate-800 border-slate-700 rounded-xl p-3 text-white" />
                <input name="category" defaultValue={editingLink.category} className="bg-slate-800 border-slate-700 rounded-xl p-3 text-white" />
                <div className="flex items-center px-4 border border-slate-700 rounded-xl bg-slate-800/50">
                    <input type="checkbox" id="editIsRec" name="isRecommended" defaultChecked={editingLink.isRecommended} className="w-5 h-5 accent-sky-500" />
                    <label htmlFor="editIsRec" className="ml-3 text-sm text-slate-300">设为推荐</label>
                </div>
              </div>
              <textarea name="description" defaultValue={editingLink.description || ''} className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-white h-24" />
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
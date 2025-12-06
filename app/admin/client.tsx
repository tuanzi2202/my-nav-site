// app/admin/client.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { addLink, deleteLink, updateLink, getCategories, autoSyncCategories, reorderCategories, deleteCategoryConfig } from '../actions'

// 类型定义
type LinkItem = { id: number; title: string; url: string; description: string | null; category: string; isRecommended: boolean; createdAt: Date }
type CategoryItem = { id: number; name: string; sortOrder: number }

export default function AdminClient({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [activeTab, setActiveTab] = useState<'links' | 'categories'>('links')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')
  
  // 拖拽相关状态
  const [draggingItem, setDraggingItem] = useState<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // 1. 初始化：加载分类 & 自动同步
  useEffect(() => {
    async function init() {
      // 这里的 true 表示如果有更新则刷新 UI
      await autoSyncCategories() 
      const data = await getCategories()
      setCategories(data)
    }
    init()
  }, [])

  // --- 拖拽逻辑 ---
  const handleDragStart = (e: React.DragEvent, position: number) => {
    setDraggingItem(position)
    dragOverItem.current = position
  }

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position
  }

  const handleDragEnd = async () => {
    const dragIndex = draggingItem
    const dropIndex = dragOverItem.current

    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDraggingItem(null)
      dragOverItem.current = null
      return
    }

    // 1. 前端数组重排
    const newCategories = [...categories]
    const draggedItemContent = newCategories[dragIndex]
    
    // 移除旧位置，插入新位置
    newCategories.splice(dragIndex, 1)
    newCategories.splice(dropIndex, 0, draggedItemContent)

    // 2. 重新计算 sortOrder (反转索引，列表第一个 sortOrder 最大)
    const len = newCategories.length
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      // 列表上面的元素，权重给大一点 (len - index)
      sortOrder: (len - index) * 10 
    }))

    // 3. 乐观更新 UI
    setCategories(updates)
    setDraggingItem(null)
    dragOverItem.current = null

    // 4. 后台保存
    await reorderCategories(updates.map(c => ({ id: c.id, sortOrder: c.sortOrder })))
  }

  // --- 链接管理逻辑 ---
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
    // 添加后刷新分类列表
    const data = await getCategories()
    setCategories(data)
  }

  async function handleUpdate(formData: FormData) {
    await updateLink(formData)
    setEditingLink(null)
    const data = await getCategories()
    setCategories(data)
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1>
          <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => setActiveTab('links')} className={`px-4 py-2 text-sm rounded-md transition ${activeTab === 'links' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>资源管理</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm rounded-md transition ${activeTab === 'categories' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>分类排序</button>
        </div>
        <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">← 前台</a>
      </header>

      {/* ==================== 选项卡 A: 资源管理 (保持不变) ==================== */}
      {activeTab === 'links' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
             <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 cursor-pointer">
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

          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-xs"><tr><th className="p-4">标题</th><th className="p-4">分类</th><th className="p-4 text-right">管理</th></tr></thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-800/30">
                    <td className="p-4 text-slate-200">{link.title}</td>
                    <td className="p-4">{link.isRecommended && <span className="text-xs bg-sky-900 text-sky-300 px-1 rounded mr-1">荐</span>}<span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{link.category}</span></td>
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

      {/* ==================== 选项卡 B: 拖拽分类排序 (核心修改) ==================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50">
                <h3 className="text-blue-200 font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                    拖拽排序
                </h3>
                <p className="text-xs text-blue-400 mt-1">按住下方的分类卡片拖动即可调整前台显示顺序。系统会自动同步新分类。</p>
            </div>

            <div className="space-y-2">
                {categories.map((cat, index) => (
                    <div 
                        key={cat.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`
                            flex items-center justify-between p-4 rounded-xl border border-slate-800/60 bg-slate-900/50 
                            cursor-grab active:cursor-grabbing transition-all duration-200
                            ${draggingItem === index ? 'opacity-50 scale-95 border-sky-500 border-dashed' : 'hover:bg-slate-800 hover:border-slate-700'}
                        `}
                    >
                        <div className="flex items-center gap-4">
                            {/* 拖拽把手图标 */}
                            <div className="text-slate-600 cursor-grab">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </div>
                            
                            {/* 序号徽章 */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                {index + 1}
                            </div>
                            
                            <span className="text-slate-200 font-medium">{cat.name}</span>
                        </div>

                        <form action={async (fd) => { await deleteCategoryConfig(fd); const d = await getCategories(); setCategories(d); }}>
                            <input type="hidden" name="id" value={cat.id} />
                            <button className="text-xs text-slate-600 hover:text-red-400 px-3 py-1 rounded hover:bg-red-900/10 transition">移除配置</button>
                        </form>
                    </div>
                ))}
                
                {categories.length === 0 && (
                    <div className="p-8 text-center text-slate-500">正在同步分类数据...</div>
                )}
            </div>
        </div>
      )}

      {/* 编辑弹窗 (保持不变) */}
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
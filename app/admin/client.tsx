// app/admin/client.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { addLink, deleteLink, updateLink, getCategories, autoSyncCategories, reorderCategories, deleteCategoryConfig, updateAnnouncement, addSmartWallpaper, deleteSmartWallpaper, updateSmartWallpaper } from '../actions'

type LinkItem = { id: number; title: string; url: string; description: string | null; category: string; isRecommended: boolean; createdAt: Date }
type CategoryItem = { id: number; name: string; sortOrder: number }
type ThemeItem = { id: number; name: string; morning: string; afternoon: string; night: string }

export default function AdminClient({ initialLinks, initialAnnouncement, initialThemes }: { initialLinks: LinkItem[], initialAnnouncement: string, initialThemes: ThemeItem[] }) {
  const [activeTab, setActiveTab] = useState<'links' | 'categories' | 'settings' | 'themes'>('links')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [announcement, setAnnouncement] = useState(initialAnnouncement)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  
  const [editingTheme, setEditingTheme] = useState<ThemeItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')
  
  const [draggingItem, setDraggingItem] = useState<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    async function init() {
      await autoSyncCategories() 
      const data = await getCategories()
      setCategories(data)
    }
    init()
  }, [])

  const handleDragStart = (e: React.DragEvent, position: number) => { setDraggingItem(position); dragOverItem.current = position }
  const handleDragEnter = (e: React.DragEvent, position: number) => { dragOverItem.current = position }
  const handleDragEnd = async () => {
    const dragIndex = draggingItem; const dropIndex = dragOverItem.current;
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) { setDraggingItem(null); dragOverItem.current = null; return; }
    const newCategories = [...categories]; const draggedItemContent = newCategories[dragIndex];
    newCategories.splice(dragIndex, 1); newCategories.splice(dropIndex, 0, draggedItemContent);
    const len = newCategories.length;
    const updates = newCategories.map((cat, index) => ({ id: cat.id, name: cat.name, sortOrder: (len - index) * 10 }));
    setCategories(updates); setDraggingItem(null); dragOverItem.current = null;
    await reorderCategories(updates.map(c => ({ id: c.id, sortOrder: c.sortOrder })));
  }

  const categoryOptions = Array.from(new Set([...initialLinks.map(l => l.category), ...categories.map(c => c.name)]))
  const filteredLinks = initialLinks.filter(link => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q)
    const matchesCategory = filterCategory === 'All' || link.category === filterCategory
    return matchesSearch && matchesCategory
  })

  async function handleAdd(formData: FormData) { await addLink(formData); const form = document.getElementById('add-form') as HTMLFormElement; if (form) form.reset(); const data = await getCategories(); setCategories(data); }
  async function handleUpdate(formData: FormData) { await updateLink(formData); setEditingLink(null); const data = await getCategories(); setCategories(data); }
  async function handleUpdateAnnouncement(formData: FormData) { await updateAnnouncement(formData); alert('公告已更新！') }
  
  async function handleUpdateTheme(formData: FormData) {
    await updateSmartWallpaper(formData)
    setEditingTheme(null)
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-800/60 pb-6 gap-4">
        <div><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1><p className="text-xs text-slate-500 mt-1">Admin Dashboard</p></div>
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            <button onClick={() => setActiveTab('links')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'links' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>资源管理</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'categories' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>分类排序</button>
            <button onClick={() => setActiveTab('themes')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'themes' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>主题管理</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>全局配置</button>
        </div>
        <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">← 前台</a>
      </header>

      {/* Tab A: 资源管理 */}
      {activeTab === 'links' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
             <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 cursor-pointer"><option value="All">全部分类</option>{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}</select>
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索资源..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200" />
          </div>
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">添加新资源</h2>
            <form id="add-form" action={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="title" placeholder="标题" required className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <input name="url" placeholder="链接" required className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <input name="category" placeholder="分类" className="bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200" />
                <div className="flex items-center px-4 border border-slate-700 rounded-xl bg-slate-800/30"><input type="checkbox" id="isRec" name="isRecommended" className="w-5 h-5 accent-sky-500" /><label htmlFor="isRec" className="ml-3 text-sm text-slate-300">设为推荐</label></div>
              </div>
              <textarea name="description" placeholder="描述..." className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200 h-20" />
              <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl">提交</button>
            </form>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-left"><thead className="bg-slate-950/50 text-slate-400 text-xs"><tr><th className="p-4">标题</th><th className="p-4">分类</th><th className="p-4 text-right">管理</th></tr></thead>
              <tbody className="divide-y divide-slate-800/50">{filteredLinks.map((link) => (<tr key={link.id} className="hover:bg-slate-800/30"><td className="p-4 text-slate-200">{link.title}</td><td className="p-4">{link.isRecommended && <span className="text-xs bg-sky-900 text-sky-300 px-1 rounded mr-1">荐</span>}<span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{link.category}</span></td><td className="p-4 text-right"><button onClick={() => setEditingLink(link)} className="text-sky-400 mr-3">编辑</button><form action={deleteLink} className="inline"><input type="hidden" name="id" value={link.id} /><button className="text-red-400">删除</button></form></td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab B: 分类排序 */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50"><h3 className="text-blue-200 font-bold">拖拽排序</h3><p className="text-xs text-blue-400 mt-1">按住下方的分类卡片拖动即可调整前台显示顺序。</p></div>
            <div className="space-y-2">{categories.map((cat, index) => (<div key={cat.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`flex items-center justify-between p-4 rounded-xl border border-slate-800/60 bg-slate-900/50 cursor-grab active:cursor-grabbing transition-all duration-200 ${draggingItem === index ? 'opacity-50 scale-95 border-sky-500 border-dashed' : 'hover:bg-slate-800 hover:border-slate-700'}`}><div className="flex items-center gap-4"><div className="text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></div><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{index + 1}</div><span className="text-slate-200 font-medium">{cat.name}</span></div><form action={async (fd) => { await deleteCategoryConfig(fd); const d = await getCategories(); setCategories(d); }}><input type="hidden" name="id" value={cat.id} /><button className="text-xs text-slate-600 hover:text-red-400 px-3 py-1 rounded hover:bg-red-900/10">移除配置</button></form></div>))}</div>
        </div>
      )}

      {/* Tab D: 主题管理 */}
      {activeTab === 'themes' && (
        <div className="space-y-8">
            <div className="bg-sky-900/20 border border-sky-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="p-2 bg-sky-900/40 rounded-lg text-sky-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-sky-200 mb-1">图片链接哪里找？</h3>
                    <p className="text-xs text-slate-400 mb-2">推荐使用 Postimages 或 Wallhere。</p>
                    <div className="flex gap-2">
                        <a 
                            href="https://postimages.org/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition"
                        >
                            Postimages (上传本地图片) <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                        {/* ✨ 修复点：使用 &rarr; 替换 -> */}
                        <a 
                            href="https://wallhere.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition"
                        >
                            Wallhere 壁纸库 (右键图片 &rarr; 复制图片地址) <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-5">添加智能轮播主题</h2>
                <form action={addSmartWallpaper} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <input name="name" placeholder="主题名称 (例如: 赛博朋克)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-orange-400 mb-1 block">早晨 (6:00-11:59)</label>
                            <textarea name="morning" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-orange-500" />
                        </div>
                        <div>
                            <label className="text-xs text-sky-400 mb-1 block">午后 (12:00-17:59)</label>
                            <textarea name="afternoon" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="text-xs text-indigo-400 mb-1 block">深夜 (18:00-5:59)</label>
                            <textarea name="night" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-indigo-500" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium">创建主题</button>
                </form>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                        <tr><th className="p-5">主题名称</th><th className="p-5">预览 (张数)</th><th className="p-5 text-right">操作</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {initialThemes.map((theme) => (
                            <tr key={theme.id} className="hover:bg-slate-800/30">
                                <td className="p-5 font-medium text-slate-200">{theme.name}</td>
                                <td className="p-5 text-xs text-slate-500">
                                    <span className="text-orange-300">早: {theme.morning.split(/[\n,]/).filter(s=>s.trim()).length}</span> <span className="mx-1">/</span> 
                                    <span className="text-sky-300">午: {theme.afternoon.split(/[\n,]/).filter(s=>s.trim()).length}</span> <span className="mx-1">/</span> 
                                    <span className="text-indigo-300">晚: {theme.night.split(/[\n,]/).filter(s=>s.trim()).length}</span>
                                </td>
                                <td className="p-5 text-right">
                                    <button onClick={() => setEditingTheme(theme)} className="text-sky-400 hover:text-sky-300 text-sm mr-3">编辑</button>
                                    <form action={deleteSmartWallpaper} className="inline">
                                        <input type="hidden" name="id" value={theme.id} />
                                        <button className="text-red-400 hover:text-red-300 text-sm">删除</button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                        {initialThemes.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-500">暂无自定义主题，前台将使用默认配置。</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Tab C: 全局配置 */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>前台公告管理</h2>
                <form action={handleUpdateAnnouncement} className="space-y-6">
                    <div><label className="block text-sm text-slate-400 mb-2">公告内容</label><textarea name="content" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 h-32 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed" placeholder="请输入要在首页显示的公告内容..." /><p className="text-xs text-slate-500 mt-2">支持普通文本，换行请直接回车。</p></div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95">更新公告</button>
                </form>
            </div>
        </div>
      )}

      {/* 编辑弹窗 */}
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
                <div className="flex items-center px-4 border border-slate-700 rounded-xl bg-slate-800/50"><input type="checkbox" id="editIsRec" name="isRecommended" defaultChecked={editingLink.isRecommended} className="w-5 h-5 accent-sky-500" /><label htmlFor="editIsRec" className="ml-3 text-sm text-slate-300">设为推荐</label></div>
              </div>
              <textarea name="description" defaultValue={editingLink.description || ''} className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-white h-24" />
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingLink(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800">取消</button><button type="submit" className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white">保存</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 主题编辑弹窗 */}
      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">编辑主题</h2>
                <button onClick={() => setEditingTheme(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form action={handleUpdateTheme} className="space-y-4">
                <input type="hidden" name="id" value={editingTheme.id} />
                <div className="grid grid-cols-1 gap-4">
                    <input name="name" defaultValue={editingTheme.name} placeholder="主题名称" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-orange-400 mb-1 block">早晨</label>
                        <textarea name="morning" defaultValue={editingTheme.morning} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                        <label className="text-xs text-sky-400 mb-1 block">午后</label>
                        <textarea name="afternoon" defaultValue={editingTheme.afternoon} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                        <label className="text-xs text-indigo-400 mb-1 block">深夜</label>
                        <textarea name="night" defaultValue={editingTheme.night} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-indigo-500" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setEditingTheme(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition">取消</button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg transition">保存修改</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
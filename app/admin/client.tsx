// app/admin/client.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  addLink, 
  deleteLink, 
  updateLink, 
  getCategories, 
  autoSyncCategories, 
  reorderCategories, 
  deleteCategoryConfig, 
  updateAnnouncement, 
  addSmartWallpaper, 
  deleteSmartWallpaper, 
  updateSmartWallpaper, 
  updateGlobalUISettings,
  createPost,   // 👈 新增这个
  deletePost    // 👈 顺便把删除功能也导入
} from '../actions'

type LinkItem = { id: number; title: string; url: string; description: string | null; category: string; isRecommended: boolean; createdAt: Date }
type CategoryItem = { id: number; name: string; sortOrder: number }
type ThemeItem = { id: number; name: string; morning: string; afternoon: string; night: string }
type HistoryItem = { id: number; content: string; createdAt: Date }

export default function AdminClient({ 
  initialLinks, 
  initialAnnouncement, 
  initialThemes, 
  initialGlobalSettings, 
  initialHistory 
}: { 
  initialLinks: LinkItem[], 
  initialAnnouncement: string, 
  initialThemes: ThemeItem[], 
  initialGlobalSettings: any,
  initialHistory: HistoryItem[]
}) {
  const [activeTab, setActiveTab] = useState<'links' | 'categories' | 'themes' | 'announcement' | 'design' | 'blog'>('links')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [announcement, setAnnouncement] = useState(initialAnnouncement)
  
  // 默认值兜底
  const defaultUISettings = {
    themeMode: 'slideshow',
    wallpaperSource: 'smart',
    bgBlur: 0,
    cardOpacity: 0.1,
    boardOpacity: 0.1,
    uiBlur: 2,
    slideshowInterval: 30,
    slideshowEffect: 'fade',
    clickEffect: 'ripple', // ✨ 默认点击特效
    descColor: '#94a3b8',
    noise: false,
    glow: false,
    tilt: false,
    ...initialGlobalSettings
  }
  const [globalSettings, setGlobalSettings] = useState(defaultUISettings)

  const [searchQuery, setSearchQuery] = useState('')
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [editingTheme, setEditingTheme] = useState<ThemeItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')
  
  const [draggingItem, setDraggingItem] = useState<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  
  const [showHistory, setShowHistory] = useState(false)

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
  async function handleUpdateAnnouncement(formData: FormData) { await updateAnnouncement(formData); alert('公告已发布！') }
  async function handleUpdateTheme(formData: FormData) { await updateSmartWallpaper(formData); setEditingTheme(null) }
  
  const updateGlobalState = (key: string, value: any) => {
    setGlobalSettings((prev: any) => ({ ...prev, [key]: value }))
  }

  async function handleSaveGlobalUI(formData: FormData) {
     if (!formData.get('noise')) formData.append('noise', 'off'); 
     if (!formData.get('glow')) formData.append('glow', 'off');
     if (!formData.get('tilt')) formData.append('tilt', 'off');
     await updateGlobalUISettings(formData);
     alert('默认视觉风格已更新！');
  }

  return (
    <div>
      <style jsx global>{`input[type=range] { -webkit-appearance: none; background: transparent; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #6366f1; cursor: pointer; margin-top: -6px; box-shadow: 0 0 10px rgba(99,102,241,0.5); } input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #334155; border-radius: 2px; }`}</style>
      
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-800/60 pb-6 gap-4">
        <div><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1><p className="text-xs text-slate-500 mt-1">Admin Dashboard</p></div>
        
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('links')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'links' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>资源管理</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'categories' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>分类排序</button>
            <button onClick={() => setActiveTab('themes')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'themes' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>主题管理</button>
            
            <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
            
            <button onClick={() => setActiveTab('announcement')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'announcement' ? 'bg-indigo-600/20 text-indigo-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>📢 公告发布</button>
            <button onClick={() => setActiveTab('design')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'design' ? 'bg-pink-600/20 text-pink-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>🎨 初始参数</button>
            <button onClick={() => setActiveTab('blog')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'blog' ? 'bg-pink-600/20 text-pink-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>📝 写博客</button>
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
            <div className="bg-sky-900/20 border border-sky-800/50 rounded-xl p-6">
                <h3 className="text-base font-bold text-sky-200 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    图片链接哪里找？
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-start">
                            <div><h4 className="text-sm font-bold text-sky-100 mb-1">方式 A：本地图片</h4><p className="text-xs text-slate-400 mb-3 leading-relaxed">上传图片后，复制 <strong>"Direct Link"</strong></p></div>
                            <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-md transition">去上传 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-start">
                             <div><h4 className="text-sm font-bold text-sky-100 mb-1">方式 B：网络壁纸</h4><p className="text-xs text-slate-400 mb-3 leading-relaxed">右键图片 &rarr; 选择 <strong>"复制图片地址"</strong></p></div>
                             <a href="https://wallhere.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition">找壁纸 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-5">添加智能轮播主题</h2>
                <form action={addSmartWallpaper} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4"><input name="name" placeholder="主题名称 (例如: 赛博朋克)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="text-xs text-orange-400 mb-1 block">早晨 (6:00-11:59)</label><textarea name="morning" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-orange-500" /></div>
                        <div><label className="text-xs text-sky-400 mb-1 block">午后 (12:00-17:59)</label><textarea name="afternoon" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-sky-500" /></div>
                        <div><label className="text-xs text-indigo-400 mb-1 block">深夜 (18:00-5:59)</label><textarea name="night" placeholder="输入图片URL，每行一个" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-indigo-500" /></div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium">创建主题</button>
                </form>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
                <table className="w-full text-left"><thead className="bg-slate-950/50 text-slate-400 text-xs uppercase"><tr><th className="p-5">主题名称</th><th className="p-5">预览 (张数)</th><th className="p-5 text-right">操作</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {initialThemes.map((theme) => (
                            <tr key={theme.id} className="hover:bg-slate-800/30">
                                <td className="p-5 font-medium text-slate-200">{theme.name}</td>
                                <td className="p-5 text-xs text-slate-500"><span className="text-orange-300">早: {theme.morning.split(/[\n,]/).filter(s=>s.trim()).length}</span> / <span className="text-sky-300">午: {theme.afternoon.split(/[\n,]/).filter(s=>s.trim()).length}</span> / <span className="text-indigo-300">晚: {theme.night.split(/[\n,]/).filter(s=>s.trim()).length}</span></td>
                                <td className="p-5 text-right"><button onClick={() => setEditingTheme(theme)} className="text-sky-400 hover:text-sky-300 text-sm mr-3">编辑</button><form action={deleteSmartWallpaper} className="inline"><input type="hidden" name="id" value={theme.id} /><button className="text-red-400 hover:text-red-300 text-sm">删除</button></form></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Tab E: 公告发布 */}
      {activeTab === 'announcement' && (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>前台公告管理</h2>
                <form action={handleUpdateAnnouncement} className="space-y-6">
                    <div><label className="block text-sm text-slate-400 mb-2">公告内容</label><textarea name="content" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 h-32 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed" placeholder="请输入要在首页显示的公告内容..." /><p className="text-xs text-slate-500 mt-2">支持普通文本，换行请直接回车。</p></div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95">更新公告</button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-300">发布历史</h3>
                    <button type="button" onClick={() => setShowHistory(!showHistory)} className="text-xs text-slate-500 hover:text-indigo-400 transition">{showHistory ? '收起' : '展开'}</button>
                  </div>
                  {showHistory && (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar bg-slate-950/30 p-2 rounded-xl">
                      {initialHistory && initialHistory.length > 0 ? initialHistory.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition group">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="text-[10px] text-slate-500 mb-1 font-mono">{new Date(item.createdAt).toLocaleString()}</div>
                            <div className="text-xs text-slate-300 line-clamp-1 group-hover:text-white transition-colors">{item.content}</div>
                          </div>
                          <button type="button" onClick={() => setAnnouncement(item.content)} className="text-xs bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white px-3 py-1.5 rounded transition whitespace-nowrap">恢复</button>
                        </div>
                      )) : <p className="text-xs text-slate-500 text-center py-4">暂无历史记录</p>}
                    </div>
                  )}
                </div>
            </div>
        </div>
      )}

      {/* ✨ Tab F: 全局视觉 (包含所有新控件) ✨ */}
      {activeTab === 'design' && (
        <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-8 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    默认视觉风格 (出厂设置)
                </h2>
                <p className="text-xs text-slate-500 mb-6">这里设置的是新访客看到的默认效果。用户个人的修改会覆盖这些设置。</p>
                
                <form action={handleSaveGlobalUI} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div><div className="flex justify-between text-xs mb-2 text-slate-300"><span>背景模糊度</span><span>{globalSettings.bgBlur}px</span></div><input type="range" name="bgBlur" min="0" max="20" step="1" defaultValue={globalSettings.bgBlur} onChange={(e) => updateGlobalState('bgBlur', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" /></div>
                            <div><div className="flex justify-between text-xs mb-2 text-slate-300"><span>卡片透明度</span><span>{Math.round(globalSettings.cardOpacity * 100)}%</span></div><input type="range" name="cardOpacity" min="0" max="1" step="0.05" defaultValue={globalSettings.cardOpacity} onChange={(e) => updateGlobalState('cardOpacity', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" /></div>
                            <div><div className="flex justify-between text-xs mb-2 text-slate-300"><span>公告透明度</span><span>{Math.round(globalSettings.boardOpacity * 100)}%</span></div><input type="range" name="boardOpacity" min="0" max="1" step="0.05" defaultValue={globalSettings.boardOpacity} onChange={(e) => updateGlobalState('boardOpacity', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" /></div>
                            <div><div className="flex justify-between text-xs mb-2 text-slate-300"><span>界面磨砂感</span><span>{globalSettings.uiBlur}px</span></div><input type="range" name="uiBlur" min="0" max="40" step="2" defaultValue={globalSettings.uiBlur} onChange={(e) => updateGlobalState('uiBlur', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" /></div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-xs text-slate-400 mb-2 block">默认背景模式</label><select name="themeMode" defaultValue={globalSettings.themeMode} onChange={(e) => updateGlobalState('themeMode', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500"><option value="default">纯色深蓝</option><option value="slideshow">动态轮播</option></select></div>
                            <div><label className="text-xs text-slate-400 mb-2 block">轮播切换动画</label><select name="slideshowEffect" defaultValue={globalSettings.slideshowEffect} onChange={(e) => updateGlobalState('slideshowEffect', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500"><option value="fade">柔和淡入</option><option value="zoom">呼吸缩放</option><option value="pan">全景运镜</option></select></div>
                            {/* ✨ 新增：轮播间隔时间 ✨ */}
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-slate-300"><span>轮播间隔时间</span><span>{globalSettings.slideshowInterval}秒</span></div>
                                <input type="range" name="slideshowInterval" min="5" max="300" step="5" defaultValue={globalSettings.slideshowInterval} onChange={(e) => updateGlobalState('slideshowInterval', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                            </div>
                            {/* ✨ 新增：鼠标点击特效 ✨ */}
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">鼠标点击特效</label>
                                <select name="clickEffect" defaultValue={globalSettings.clickEffect} onChange={(e) => updateGlobalState('clickEffect', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500">
                                    <option value="none">关闭</option>
                                    <option value="ripple">波纹</option>
                                    <option value="particles">粒子</option>
                                    <option value="bubble">气泡</option>
                                </select>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 pt-2">
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" name="tilt" defaultChecked={globalSettings.tilt} className="accent-pink-500" /> 3D视差</label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" name="glow" defaultChecked={globalSettings.glow} className="accent-pink-500" /> 鼠标光晕</label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" name="noise" defaultChecked={globalSettings.noise} className="accent-pink-500" /> 噪点质感</label>
                            </div>
                        </div>
                    </div>
                    {/* ✨ 新增：描述文本颜色 ✨ */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50 mt-4">
                        <span className="text-sm font-medium text-slate-300">描述文字颜色</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono">{globalSettings.descColor}</span>
                            <input type="color" name="descColor" defaultValue={globalSettings.descColor} onChange={(e) => updateGlobalState('descColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-pink-500/20 transition-all transform active:scale-95 mt-4">保存为默认配置</button>
                </form>
            </div>
        </div>
      )}

      {/* Tab: 博客发布 (简易版) */}
      {activeTab === 'blog' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">发布新文章</h2>
            <form action={createPost} className="space-y-4">
              <input name="title" placeholder="文章标题" required className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-white" />
              <input name="summary" placeholder="简短摘要 (选填)" className="w-full bg-slate-800 border-slate-700 rounded-xl p-3 text-white" />
              <textarea name="content" placeholder="文章正文 (支持 Markdown)..." required className="w-full h-64 bg-slate-800 border-slate-700 rounded-xl p-3 text-white font-mono" />
              <div className="flex items-center gap-2">
                <input type="checkbox" name="published" id="pub" className="w-5 h-5 accent-indigo-500" defaultChecked />
                <label htmlFor="pub" className="text-slate-300">立即发布</label>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl">发布</button>
            </form>
          </div>
        </div>
      )}

      {/* 编辑弹窗 (Link) */}
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
                <div className="grid grid-cols-1 gap-4"><input name="name" defaultValue={editingTheme.name} placeholder="主题名称" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500" /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="text-xs text-orange-400 mb-1 block">早晨</label><textarea name="morning" defaultValue={editingTheme.morning} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-orange-500" /></div>
                    <div><label className="text-xs text-sky-400 mb-1 block">午后</label><textarea name="afternoon" defaultValue={editingTheme.afternoon} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-sky-500" /></div>
                    <div><label className="text-xs text-indigo-400 mb-1 block">深夜</label><textarea name="night" defaultValue={editingTheme.night} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-200 text-xs h-32 focus:outline-none focus:border-indigo-500" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setEditingTheme(null)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition">取消</button><button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg transition">保存修改</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
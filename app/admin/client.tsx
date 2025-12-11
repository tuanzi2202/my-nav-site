'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  addLink, deleteLink, updateLink, 
  getCategories, autoSyncCategories, reorderCategories, deleteCategoryConfig, 
  updateAnnouncement, 
  addSmartWallpaper, deleteSmartWallpaper, updateSmartWallpaper, 
  updateGlobalUISettings,
  createPost, updatePost, deletePost
  // 🧹 移除了便利贴相关的 actions 引用
} from '../actions'

// --- 类型定义 ---
type LinkItem = { id: number; title: string; url: string; description: string | null; category: string; isRecommended: boolean; createdAt: Date }
type CategoryItem = { id: number; name: string; sortOrder: number }
type ThemeItem = { id: number; name: string; morning: string; afternoon: string; night: string }
type HistoryItem = { id: number; content: string; createdAt: Date }
type PostItem = { 
  id: number; 
  title: string; 
  content: string; 
  summary: string | null; 
  published: boolean; 
  isMarkdown: boolean; 
  backgroundImage: string | null;
  contentBgColor: string;
  contentBgOpacity: number;
  createdAt: Date
}
// 🧹 NoteItem 类型已移除

export default function AdminClient({ 
  initialLinks, 
  initialAnnouncement, 
  initialThemes, 
  initialGlobalSettings, 
  initialHistory,
  initialPosts = [],
  // 🧹 initialNotes 参数已移除
}: { 
  initialLinks: LinkItem[], 
  initialAnnouncement: string, 
  initialThemes: ThemeItem[], 
  initialGlobalSettings: any,
  initialHistory: HistoryItem[],
  initialPosts?: PostItem[],
}) {
  // 🧹 'notes' 选项已从 Tab 类型中移除
  const [activeTab, setActiveTab] = useState<'links' | 'categories' | 'themes' | 'announcement' | 'design' | 'blog'>('links')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [announcement, setAnnouncement] = useState(initialAnnouncement)
  
  const [editingPost, setEditingPost] = useState<PostItem | null>(null)
  const [useMarkdown, setUseMarkdown] = useState(true)
  
  // 🧹 editingNote 状态已移除

  const newPostTemplate: PostItem = { 
    id: 0, title: '', content: '', summary: '', published: true, isMarkdown: true,
    backgroundImage: '', contentBgColor: '#0f172a', contentBgOpacity: 0.8, createdAt: new Date() 
  }

  const defaultUISettings = {
    themeMode: 'slideshow', wallpaperSource: 'smart', bgBlur: 0, cardOpacity: 0.1, boardOpacity: 0.1, uiBlur: 2,
    slideshowInterval: 30, slideshowEffect: 'fade', clickEffect: 'ripple', descColor: '#94a3b8',
    noise: false, glow: false, tilt: false,
    live2dModel: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
    live2dScale: 0.12,
    live2dX: 0,
    live2dY: 0,
    live2dWidth: 280,
    live2dHeight: 480,
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
    if (editingPost) {
      setUseMarkdown(editingPost.isMarkdown ?? true)
    }
  }, [editingPost])

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
  async function handleUpdatePost(formData: FormData) { await updatePost(formData); setEditingPost(null); alert('文章已更新！') }

  // 🧹 handleUpdateNote 函数已移除

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

  // 🧹 移除了 'notes' 相关的宽度计算逻辑，只保留 blog 的特例
  const containerMaxWidth = activeTab === 'blog' ? 'max-w-7xl' : 'max-w-5xl'

  return (
    <div className={`${containerMaxWidth} mx-auto transition-all duration-300 ease-in-out`}>
      <style jsx global>{`input[type=range] { -webkit-appearance: none; background: transparent; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #6366f1; cursor: pointer; margin-top: -6px; box-shadow: 0 0 10px rgba(99,102,241,0.5); } input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #334155; border-radius: 2px; }`}</style>
      
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-slate-800/60 pb-6 gap-4">
        <div><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">控制台</h1><p className="text-xs text-slate-500 mt-1">Admin Dashboard</p></div>
        
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('links')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'links' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>资源管理</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'categories' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>分类排序</button>
            <button onClick={() => setActiveTab('themes')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'themes' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>主题管理</button>
            
            <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
            
            <button onClick={() => setActiveTab('announcement')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'announcement' ? 'bg-indigo-600/20 text-indigo-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>📢 公告发布</button>
            <button onClick={() => setActiveTab('design')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'design' ? 'bg-pink-600/20 text-pink-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>🎨 全局视觉</button>
            
            <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>
            <button onClick={() => setActiveTab('blog')} className={`px-4 py-2 text-sm rounded-md transition whitespace-nowrap ${activeTab === 'blog' ? 'bg-emerald-600/20 text-emerald-300 shadow' : 'text-slate-500 hover:text-slate-300'}`}>📝 博客管理</button>
            
            {/* 🧹 "便利贴墙" 按钮已移除，请直接访问前台 /notes 页面进行管理 */}
        </div>
        
        <a href="/" className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700">← 前台</a>
      </header>

      {/* ... (Links, Categories, Themes, Announcement, Design Tabs 保持不变) ... */}
      
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

      {activeTab === 'categories' && (
        <div className="space-y-6">
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50"><h3 className="text-blue-200 font-bold">拖拽排序</h3><p className="text-xs text-blue-400 mt-1">按住下方的分类卡片拖动即可调整前台显示顺序。</p></div>
            <div className="space-y-2">{categories.map((cat, index) => (<div key={cat.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`flex items-center justify-between p-4 rounded-xl border border-slate-800/60 bg-slate-900/50 cursor-grab active:cursor-grabbing transition-all duration-200 ${draggingItem === index ? 'opacity-50 scale-95 border-sky-500 border-dashed' : 'hover:bg-slate-800 hover:border-slate-700'}`}><div className="flex items-center gap-4"><div className="text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></div><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{index + 1}</div><span className="text-slate-200 font-medium">{cat.name}</span></div><form action={async (fd) => { await deleteCategoryConfig(fd); const d = await getCategories(); setCategories(d); }}><input type="hidden" name="id" value={cat.id} /><button className="text-xs text-slate-600 hover:text-red-400 px-3 py-1 rounded hover:bg-red-900/10">移除配置</button></form></div>))}</div>
        </div>
      )}

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
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-slate-300"><span>轮播间隔时间</span><span>{globalSettings.slideshowInterval}秒</span></div>
                                <input type="range" name="slideshowInterval" min="5" max="300" step="5" defaultValue={globalSettings.slideshowInterval} onChange={(e) => updateGlobalState('slideshowInterval', e.target.value)} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                            </div>
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
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50 mt-4">
                        <span className="text-sm font-medium text-slate-300">描述文字颜色</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono">{globalSettings.descColor}</span>
                            <input type="color" name="descColor" defaultValue={globalSettings.descColor} onChange={(e) => updateGlobalState('descColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                        </div>
                    </div>

                    {/* ✨✨✨ 新增：看板娘设置区块 ✨✨✨ */}
                    <div className="pt-6 border-t border-slate-800">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>👧 看板娘设置 (Live2D)</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {/* 模型 URL */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">模型配置文件 (Model3 JSON URL)</label>
                                <input 
                                    name="live2dModel" 
                                    defaultValue={globalSettings.live2dModel} 
                                    onChange={(e) => updateGlobalState('live2dModel', e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    推荐使用 GitHub 或 CDN 链接。例如: <code>https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json</code>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 缩放 */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2 text-slate-300">
                                        <span>缩放比例 (Scale)</span>
                                        <span className="font-mono text-pink-400">{Number(globalSettings.live2dScale).toFixed(2)}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        name="live2dScale" 
                                        min="0.05" max="0.5" step="0.01" 
                                        defaultValue={globalSettings.live2dScale} 
                                        onChange={(e) => updateGlobalState('live2dScale', e.target.value)}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" 
                                    />
                                </div>

                                {/* 水平偏移 */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2 text-slate-300">
                                        <span>水平偏移 (X Offset)</span>
                                        <span className="font-mono text-pink-400">{globalSettings.live2dX}px</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        name="live2dX" 
                                        min="-100" max="100" step="5" 
                                        defaultValue={globalSettings.live2dX} 
                                        onChange={(e) => updateGlobalState('live2dX', e.target.value)}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" 
                                    />
                                </div>

                                {/* 垂直偏移 */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2 text-slate-300">
                                        <span>垂直偏移 (Y Offset)</span>
                                        <span className="font-mono text-pink-400">{globalSettings.live2dY}px</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        name="live2dY" 
                                        min="-200" max="800" step="5" 
                                        defaultValue={globalSettings.live2dY} 
                                        onChange={(e) => updateGlobalState('live2dY', e.target.value)}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" 
                                    />
                                </div>
                            </div>

                            {/* ✨✨✨ 新增：画布容器尺寸控制 ✨✨✨ */}
                            <div className="col-span-full border-t border-slate-800 pt-4 mt-2">
                                <h4 className="text-xs font-bold text-slate-400 mb-4">📦 交互区域大小 (减小此数值可减少遮挡)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 画布宽度 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-2 text-slate-300">
                                            <span>画布宽度 (Width)</span>
                                            <span className="font-mono text-emerald-400">{globalSettings.live2dWidth}px</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            name="live2dWidth" 
                                            min="100" max="500" step="10" 
                                            defaultValue={globalSettings.live2dWidth} 
                                            onChange={(e) => updateGlobalState('live2dWidth', e.target.value)}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                        />
                                    </div>

                                    {/* 画布高度 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-2 text-slate-300">
                                            <span>画布高度 (Height)</span>
                                            <span className="font-mono text-emerald-400">{globalSettings.live2dHeight}px</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            name="live2dHeight" 
                                            min="100" max="800" step="10" 
                                            defaultValue={globalSettings.live2dHeight} 
                                            onChange={(e) => updateGlobalState('live2dHeight', e.target.value)}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-xl font-medium shadow-lg shadow-pink-500/20 transition-all transform active:scale-95 mt-4">保存为默认配置</button>
                </form>
            </div>
        </div>
      )}

      {activeTab === 'blog' && (
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
             <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">文章管理</h2>
                <p className="text-sm text-slate-500 mt-1">共 {initialPosts.length} 篇文章</p>
             </div>
             <button 
                onClick={() => setEditingPost(newPostTemplate)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                写博客
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialPosts.map(post => (
              <div key={post.id} className="group relative bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/10 hover:-translate-y-1">
                 <div className="absolute top-4 right-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${post.published ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                       {post.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                 </div>

                 <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-100 mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                       {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                 </div>
                 
                 <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-6 h-[4.5em]">
                    {post.summary || post.content.slice(0, 100) || '暂无摘要...'}
                 </p>

                 <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-800/50">
                    <button onClick={() => setEditingPost(post)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded-lg transition">
                       编辑
                    </button>
                    <form action={deletePost} className="flex-1">
                       <input type="hidden" name="id" value={post.id} />
                       <button onClick={(e) => !confirm('确定删除吗？') && e.preventDefault()} className="w-full bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 text-sm py-2 rounded-lg transition">
                          删除
                       </button>
                    </form>
                 </div>
              </div>
            ))}
            
            {initialPosts.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                   <p className="text-slate-500">还没有文章，开始创作吧 ✨</p>
                </div>
            )}
          </div>

          {editingPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
               <div className="w-full max-w-5xl h-full max-h-[90vh] bg-[#0f172a] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  
                  <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                     <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingPost.id === 0 ? '📝 新建文章' : '✏️ 编辑文章'}
                     </h3>
                     <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                     </button>
                  </div>

                  <form action={editingPost.id === 0 ? createPost : handleUpdatePost} className="flex-1 flex flex-col overflow-hidden">
                     {editingPost.id !== 0 && <input type="hidden" name="id" value={editingPost.id} />}
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6">
                        <input 
                           name="title" 
                           defaultValue={editingPost.title} 
                           placeholder="在此输入标题..." 
                           required 
                           className="w-full bg-transparent border-none text-3xl md:text-4xl font-bold text-white placeholder-slate-600 focus:ring-0 px-0" 
                        />
                        
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                           <input 
                              name="summary" 
                              defaultValue={editingPost.summary || ''} 
                              placeholder="一句话摘要 (选填)..." 
                              className="w-full bg-transparent border-none text-sm text-slate-400 focus:ring-0 px-0" 
                           />
                        </div>

                        <details className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden group">
                          <summary className="flex items-center gap-2 p-4 cursor-pointer select-none text-slate-400 hover:text-white transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                            <span className="text-sm font-medium">🎨 页面外观设置 (背景图 & 配色)</span>
                            <svg className="w-4 h-4 ml-auto transform group-open:rotate-180 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </summary>
                          
                          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <label className="text-xs text-slate-500">全屏背景图片 (URL)</label>
                              <input 
                                name="backgroundImage" 
                                defaultValue={editingPost.backgroundImage || ''} 
                                placeholder="https://..." 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none" 
                              />
                              <p className="text-[10px] text-slate-600">留空则使用默认深色背景</p>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <span>阅读板背景色</span>
                                  <span className="font-mono text-slate-400">{editingPost.contentBgColor}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <input 
                                    type="color" 
                                    name="contentBgColor" 
                                    defaultValue={editingPost.contentBgColor || '#0f172a'} 
                                    className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700" 
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <span>阅读板透明度</span>
                                  <span>{Math.round((editingPost.contentBgOpacity || 0.8) * 100)}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  name="contentBgOpacity" 
                                  min="0" max="1" step="0.05" 
                                  defaultValue={editingPost.contentBgOpacity || 0.8}
                                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
                                />
                              </div>
                            </div>
                          </div>
                        </details>

                        <div className="flex items-center gap-3 px-1">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useMarkdown ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useMarkdown ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <input 
                              type="checkbox" 
                              name="isMarkdown" 
                              checked={useMarkdown} 
                              onChange={(e) => setUseMarkdown(e.target.checked)} 
                              className="hidden" 
                            />
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition">
                              {useMarkdown ? 'Markdown 模式' : '纯文本模式'}
                            </span>
                          </label>
                          
                          {!useMarkdown && (
                            <span className="text-xs text-slate-500">所见即所得，不支持任何格式语法</span>
                          )}
                        </div>

                        {useMarkdown ? (
                          <MarkdownEditor 
                              name="content" 
                              defaultValue={editingPost.content} 
                              required
                              className="flex-1 h-full min-h-[500px]" 
                          />
                        ) : (
                          <textarea 
                              name="content" 
                              defaultValue={editingPost.content}
                              required
                              placeholder="在此输入纯文本内容..."
                              className="flex-1 w-full h-full min-h-[500px] bg-slate-950/30 border border-slate-700 rounded-xl p-6 text-slate-300 font-sans text-base focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                          />
                        )}
                     </div>

                     <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition">
                           <input 
                              type="checkbox" 
                              name="published" 
                              className="w-4 h-4 accent-emerald-500 rounded border-slate-700 bg-slate-800" 
                              defaultChecked={editingPost.published} 
                           />
                           是否公开发布
                        </label>
                        <div className="flex gap-3">
                           <button type="button" onClick={() => setEditingPost(null)} className="px-5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
                              放弃
                           </button>
                           <button type="submit" className="px-8 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                              {editingPost.id === 0 ? '发布' : '保存更新'}
                           </button>
                        </div>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </div>
      )}

      {/* 🧹 Convenience Sticky Note Wall 渲染块已移除 */}

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

// ... MarkdownEditor and ToolButton (保持不变，省略以节省空间，实际部署时请保留) ...
function MarkdownEditor({ name, defaultValue, className, required }: { name: string, defaultValue?: string, className?: string, required?: boolean }) {
  const [content, setContent] = useState(defaultValue || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(defaultValue || '')
  }, [defaultValue])

  const insertSyntax = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const before = text.substring(0, start)
    const selection = text.substring(start, end) || placeholder
    const after = text.substring(end)

    const newText = before + prefix + selection + suffix + after
    
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selection.length)
    }, 0)
  }

  return (
    <div className={`flex flex-col border border-slate-700 rounded-xl overflow-hidden bg-slate-950/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all ${className}`}>
      <div className="flex items-center gap-1 p-2 border-b border-slate-800 bg-slate-900/80">
        <ToolButton icon="B" label="加粗" onClick={() => insertSyntax('**', '**', '粗体文本')} />
        <ToolButton icon="I" label="斜体" onClick={() => insertSyntax('*', '*', '斜体文本')} />
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <ToolButton icon="#" label="标题" onClick={() => insertSyntax('## ', '', '标题文本')} />
        <ToolButton icon="Link" label="链接" onClick={() => insertSyntax('[', '](url)', '链接描述')} />
        <ToolButton icon="Img" label="图片" onClick={() => insertSyntax('![', '](https://)', '图片描述')} active />
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <ToolButton icon="Code" label="代码" onClick={() => insertSyntax('```\n', '\n```', 'console.log("Hello")')} />
        
        <div className="flex-1" />
        <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors px-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          去传图
        </a>
      </div>

      <textarea
        ref={textareaRef}
        name={name}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required={required}
        placeholder="开始你的创作 (支持 Markdown)..."
        className="flex-1 w-full bg-transparent border-none text-slate-300 font-mono text-base p-4 focus:ring-0 resize-none leading-relaxed min-h-[400px]"
      />
    </div>
  )
}

function ToolButton({ icon, label, onClick, active }: any) {
  const icons: any = {
    'B': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />,
    'I': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l4-14" />,
    '#': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />,
    'Link': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
    'Img': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    'Code': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  }

  return (
    <button 
      type="button" 
      onClick={onClick} 
      title={label}
      className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors ${active ? 'text-emerald-400 bg-emerald-900/20' : ''}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon]}
      </svg>
    </button>
  )
}
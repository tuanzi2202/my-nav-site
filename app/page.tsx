// app/page.tsx
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
const prisma = new PrismaClient()

interface Props {
  searchParams: Promise<{ category?: string; query?: string }>
}

function formatUrl(url: string) { /* ...保持不变... */ if (!url) return '#'; const cleanUrl = url.trim(); if (!cleanUrl.startsWith('http')) return `https://${cleanUrl}`; return cleanUrl; }
function getFaviconUrl(rawUrl: string) { /* ...保持不变... */ try { const hostname = new URL(formatUrl(rawUrl)).hostname; return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`; } catch { return "https://www.google.com/s2/favicons?domain=google.com&sz=128"; } }

export default async function Home(props: Props) {
  const searchParams = await props.searchParams
  
  // 1. ✨ 核心修改：默认分类由 'All' 改为 'Recommended'
  const currentCategory = searchParams.category || 'Recommended'
  const searchQuery = searchParams.query || ''
  
  // 获取分类统计
  const categoriesData = await prisma.link.groupBy({
    by: ['category'],
    _count: { category: true }
  })

  // 2. ✨ 构建查询条件
  const whereCondition: any = {}
  
  // 搜索优先
  if (searchQuery) {
    whereCondition.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { url: { contains: searchQuery, mode: 'insensitive' } },
    ]
  } else {
    // 分类筛选逻辑
    if (currentCategory === 'Recommended') {
      // ✨ 只有在这里筛选 isRecommended = true
      whereCondition.isRecommended = true
    } else if (currentCategory !== 'All') {
      whereCondition.category = currentCategory
    }
    // 如果是 All，则不加任何条件，显示所有
  }

  let links: any[] = []
  try {
    links = await prisma.link.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    })
  } catch (e) { console.error(e) }

  return (
    <div className="flex min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-[#0f172a] to-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30">
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.4); border-radius: 20px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.8); }`}</style>

      {/* 左侧侧边栏 */}
      <aside className="w-64 border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-xl flex-col hidden md:flex fixed h-full z-20">
        <div className="p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">MyNav</h1>
          <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Developer Hub</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
          {/* ✨ 1. 全部工具 (All) */}
          <a 
            href="/?category=All" 
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'All' ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white text-slate-400'}`}
          >
            <span>全部工具</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md">All</span>
          </a>

          {/* ✨ 2. 推荐分类 (Recommended) - 默认选中项 */}
          <a 
            href="/?category=Recommended" 
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentCategory === 'Recommended' ? 'bg-sky-600/90 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-500' : 'hover:bg-slate-800/50 hover:text-white text-slate-400'}`}
          >
            <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> 站长推荐</span>
          </a>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>

          {categoriesData.map((cat) => (
            <a 
              key={cat.category}
              href={`/?category=${cat.category}`}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${currentCategory === cat.category ? 'bg-slate-800 text-sky-400 ring-1 ring-slate-700' : 'hover:bg-slate-800/50 hover:text-white text-slate-400'}`}
            >
              <span>{cat.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${currentCategory === cat.category ? 'bg-sky-900/30 text-sky-300' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                {cat._count.category}
              </span>
            </a>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800/50">
            <a href="/admin" className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-sky-400 transition py-2 rounded-lg hover:bg-slate-800/50">管理控制台</a>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 relative z-10">
        <header className="md:hidden mb-8 flex justify-between items-center bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 sticky top-4 z-50">
             <h1 className="text-xl font-bold text-white">MyNav</h1>
             <a href="/admin" className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-sky-400">Admin</a>
        </header>

        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {currentCategory === 'All' ? '全部工具' : (currentCategory === 'Recommended' ? '站长推荐' : currentCategory)}
                </h2>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    {searchQuery ? `搜索 "${searchQuery}" 的结果` : `收录了 ${links.length} 个优质资源`}
                </p>
            </div>
            {/* 搜索框 */}
            <form action="/" method="get" className="relative w-full md:w-80 group">
                {currentCategory !== 'Recommended' && <input type="hidden" name="category" value={currentCategory} />}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
                <input type="text" name="query" defaultValue={searchQuery} placeholder="搜索资源..." className="w-full bg-slate-900/50 border border-slate-700/50 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all shadow-sm" />
            </form>
        </div>

        {/* 资源列表 (保持不变) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {links.map((link: any) => (
            <a key={link.id} href={formatUrl(link.url)} target="_blank" rel="noopener noreferrer" className="group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500"></div>
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="w-12 h-12 bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 group-hover:border-sky-500/30 group-hover:scale-105 transition-all duration-300 shadow-sm">
                    <img src={getFaviconUrl(link.url)} alt="icon" className="w-full h-full object-contain opacity-90 group-hover:opacity-100 filter grayscale-[20%] group-hover:grayscale-0 transition-all" loading="lazy" />
                </div>
                <span className="text-[10px] font-medium tracking-wide bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700/50">{link.category}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1 mb-2 tracking-tight">{link.title}</h3>
              {link.description && <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1 group-hover:text-slate-400 transition-colors">{link.description}</p>}
            </a>
          ))}
          {links.length === 0 && <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20"><p className="text-slate-400 font-medium">没有内容</p></div>}
        </div>
      </main>
    </div>
  )
}
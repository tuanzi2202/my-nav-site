// app/page.tsx
import { PrismaClient } from '@prisma/client'

// 1. 强制动态渲染
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// 定义 Props 类型
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ---------------------------------------------------------
// 工具函数保持不变
// ---------------------------------------------------------
function formatUrl(url: string) {
  if (!url) return '#'
  const cleanUrl = url.trim()
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return `https://${cleanUrl}`
  }
  return cleanUrl
}

function getFaviconUrl(rawUrl: string) {
  try {
    const formattedUrl = formatUrl(rawUrl)
    const hostname = new URL(formattedUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` // 改为128获取更高清图标
  } catch (e) {
    return "https://www.google.com/s2/favicons?domain=google.com&sz=128"
  }
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams
  const currentCategory = typeof searchParams.category === 'string' ? searchParams.category : 'All'
  
  // 获取分类统计
  const categoriesData = await prisma.link.groupBy({
    by: ['category'],
    _count: { category: true }
  })

  // 构建查询条件
  const whereCondition = currentCategory === 'All' ? {} : { category: currentCategory }

  let links = []
  try {
    links = await prisma.link.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    })
  } catch (e) {
    console.error("DB Error:", e)
  }

  return (
    // ✨ 美化点 1: 背景增加顶部光晕效果 (Radial Gradient)
    <div className="flex min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-[#0f172a] to-[#0f172a] text-slate-300 font-sans selection:bg-sky-500/30">
      
      {/* 左侧侧边栏 */}
      <aside className="w-64 border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-xl flex-col hidden md:flex fixed h-full z-20">
        <div className="p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            MyNav
          </h1>
          <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Developer Hub</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <a 
            href="/" 
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentCategory === 'All' 
                ? 'bg-sky-600/90 text-white shadow-lg shadow-sky-500/20 ring-1 ring-sky-500' 
                : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
            }`}
          >
            <span>全部工具</span>
            {/* ✨ 美化点 2: 数量标签样式优化 */}
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${currentCategory === 'All' ? 'bg-white/20' : 'bg-slate-800'}`}>All</span>
          </a>

          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>

          {categoriesData.map((cat) => (
            <a 
              key={cat.category}
              href={`/?category=${cat.category}`}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                currentCategory === cat.category 
                  ? 'bg-slate-800 text-sky-400 ring-1 ring-slate-700' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
              }`}
            >
              <span>{cat.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                currentCategory === cat.category 
                  ? 'bg-sky-900/30 text-sky-300' 
                  : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
              }`}>
                {cat._count.category}
              </span>
            </a>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800/50">
            <a href="/admin" className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-sky-400 transition py-2 rounded-lg hover:bg-slate-800/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                管理控制台
            </a>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 relative z-10">
        <header className="md:hidden mb-8 flex justify-between items-center bg-slate-900/80 backdrop-blur p-4 rounded-xl border border-slate-800 sticky top-4 z-50">
             <h1 className="text-xl font-bold text-white bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent">MyNav</h1>
             <a href="/admin" className="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-sky-400 border border-slate-700">Admin</a>
        </header>

        <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {currentCategory === 'All' ? '探索工具' : currentCategory}
            </h2>
            <p className="text-slate-400 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                收录了 {links.length} 个优质资源
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {links.map((link) => (
            <a 
              key={link.id} 
              href={formatUrl(link.url)} 
              target="_blank"
              rel="noopener noreferrer"
              // ✨ 美化点 3: 卡片样式重构 (移除底部文字，增加 Hover 动效)
              className="group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 hover:bg-slate-800/60 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden"
            >
              {/* 右上角光效背景 */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500"></div>

              {/* ✨ 美化点 4: 右上角添加隐形箭头，Hover 时显现 */}
              <div className="absolute top-5 right-5 text-slate-600 opacity-0 transform -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-sky-400 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </div>

              <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="w-12 h-12 bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 group-hover:border-sky-500/30 group-hover:scale-105 transition-all duration-300 shadow-sm">
                    <img 
                        src={getFaviconUrl(link.url)}
                        alt="icon"
                        className="w-full h-full object-contain opacity-90 group-hover:opacity-100 filter grayscale-[20%] group-hover:grayscale-0 transition-all"
                        loading="lazy"
                    />
                </div>
                <span className="text-[10px] font-medium tracking-wide bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700/50">
                    {link.category}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1 mb-2 tracking-tight">
                {link.title}
              </h3>
              
              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1 group-hover:text-slate-400 transition-colors">
                {link.description || "暂无描述"}
              </p>
              
              {/* 原来的底部文字已被删除，取而代之的是整体可点击和右上角的箭头反馈 */}
            </a>
          ))}
          
          {links.length === 0 && (
             <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20">
                 <div className="inline-block p-4 rounded-full bg-slate-800/50 mb-4 text-slate-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                 </div>
                 <p className="text-slate-400 font-medium">该分类下暂无内容</p>
                 <a href="/admin" className="text-sky-500 hover:text-sky-400 hover:underline mt-2 inline-block text-sm transition">去后台添加一个？</a>
             </div>
          )}
        </div>
      </main>
    </div>
  )
}
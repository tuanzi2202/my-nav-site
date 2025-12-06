// app/page.tsx
import { PrismaClient } from '@prisma/client'

// ---------------------------------------------------------
// 👇 核心修复：强制使用动态渲染
// 这告诉 Vercel：“构建时别执行数据库查询，等用户访问时再执行！”
export const dynamic = 'force-dynamic'
// ---------------------------------------------------------

// 实例化 Prisma
const prisma = new PrismaClient()

export default async function Home() {
  try {
    // 尝试获取数据
    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            My Navigator
          </h1>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {links.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center">暂无数据，数据库连接正常。</p>
          ) : (
            links.map((link) => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 bg-gray-800 rounded-xl hover:bg-gray-700 transition hover:-translate-y-1 border border-gray-700"
              >
                <h2 className="text-xl font-semibold mb-2">{link.title}</h2>
                <p className="text-gray-400 text-sm">{link.description}</p>
              </a>
            ))
          )}
        </div>
      </main>
    )
  } catch (error) {
    // 👇 错误捕获：如果数据库连接失败，显示错误信息而不是让页面崩溃
    console.error("DB Error:", error)
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="bg-red-900/50 p-6 rounded-lg border border-red-500 max-w-lg text-center">
          <h2 className="text-2xl font-bold text-red-200 mb-2">数据库连接失败</h2>
          <p className="text-red-300 text-sm mb-4">请检查 Vercel 环境变量设置。</p>
          <pre className="text-xs text-left bg-black p-4 rounded overflow-auto">
            {String(error)}
          </pre>
        </div>
      </main>
    )
  }
}
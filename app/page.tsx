// app/page.tsx
import { PrismaClient } from '@prisma/client'

// 实例化 Prisma 客户端
// 注意：在开发环境（Next.js Hot Reload）中，频繁实例化可能导致连接数过多
// 但在生产环境（Vercel）这是标准的 Server Component 写法
const prisma = new PrismaClient()

export default async function Home() {
  // 从数据库获取数据，按创建时间倒序
  const links = await prisma.link.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-10 text-center">
        {/* 确保这里的 h1 标签是完整的 */}
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          My Navigator
        </h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {links.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center">暂无数据，请检查数据库连接或手动添加数据。</p>
        ) : (
          links.map((link) => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank"
              // rel="noopener noreferrer" 是打开外链的安全最佳实践
              rel="noopener noreferrer"
              className="block p-6 bg-gray-800 rounded-xl hover:bg-gray-700 transition hover:-translate-y-1 border border-gray-700"
            >
              <h2 className="text-xl font-semibold mb-2">{link.title}</h2>
              <p className="text-gray-400 text-sm">{link.description || "No description"}</p>
              <span className="inline-block mt-4 text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                {link.category}
              </span>
            </a>
          ))
        )}
      </div>
    </main>
  )
}
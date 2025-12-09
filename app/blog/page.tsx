import { getPublishedPosts } from '../actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-center border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            Blog Hub
          </h1>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">
            ← 返回导航
          </Link>
        </header>

        <div className="grid gap-6">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.id}`} className="group block p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-sky-500/30 hover:bg-slate-800/50 transition-all">
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-sky-400 transition-colors mb-2">
                {post.title}
              </h2>
              <div className="text-xs text-slate-500 mb-3 font-mono">
                {post.createdAt.toLocaleString()}
              </div>
              <p className="text-slate-400 text-sm line-clamp-2">
                {post.summary || post.content.slice(0, 100) + '...'}
              </p>
            </Link>
          ))}
          {posts.length === 0 && <div className="text-center text-slate-500 py-10">暂无文章，请在后台发布。</div>}
        </div>
      </div>
    </div>
  )
}
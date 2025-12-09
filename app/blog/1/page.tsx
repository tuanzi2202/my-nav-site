import { getPostById } from '../../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BlogPost({ params }: Props) {
  // ✅ 1. 必须先 await params
  const resolvedParams = await params
  
  // ✅ 2. 安全转换 ID，失败则给 0 (0 会导致查不到数据从而 notFound，这是安全的)
  const postId = parseInt(resolvedParams.id) || 0

  // 3. 查询数据
  const post = await getPostById(postId)

  if (!post) notFound()

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 p-8 font-sans selection:bg-indigo-500/30">
      <article className="max-w-3xl mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-1 mb-8 text-sky-500 hover:text-sky-400 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          返回列表
        </Link>
        
        <header className="mb-8 border-b border-slate-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 leading-tight">{post.title}</h1>
          <time className="text-slate-500 text-sm font-mono block">{post.createdAt.toLocaleString()}</time>
        </header>

        {/* 文章内容区：使用 whitespace-pre-wrap 保持换行 */}
        <div className="prose prose-invert prose-slate max-w-none leading-relaxed whitespace-pre-wrap text-slate-300">
           {post.content}
        </div>
      </article>
    </div>
  )
}
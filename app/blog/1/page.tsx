import { getPostById } from '../../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// 这里简单处理文本换行，如果需要 Markdown 渲染，建议安装 'react-markdown'
// npm install react-markdown
// import ReactMarkdown from 'react-markdown'

export default async function BlogPost({ params }: { params: { id: string } }) {
  const { id } = await params
  const post = await getPostById(parseInt(id))

  if (!post) notFound()

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 p-8 font-sans selection:bg-indigo-500/30">
      <article className="max-w-3xl mx-auto">
        <Link href="/blog" className="inline-block mb-8 text-sky-500 hover:text-sky-400 text-sm">
          ← 返回列表
        </Link>
        
        <header className="mb-8 border-b border-slate-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">{post.title}</h1>
          <time className="text-slate-500 text-sm font-mono">{post.createdAt.toLocaleString()}</time>
        </header>

        <div className="prose prose-invert prose-slate max-w-none leading-relaxed whitespace-pre-wrap text-slate-300">
           {/* 如果引入了 react-markdown: <ReactMarkdown>{post.content}</ReactMarkdown> */}
           {post.content}
        </div>
      </article>
    </div>
  )
}
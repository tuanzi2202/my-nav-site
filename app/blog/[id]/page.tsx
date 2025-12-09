import { getPostById } from '../../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
// ✨ 1. 引入渲染库
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BlogPost({ params }: Props) {
  const resolvedParams = await params
  const postId = parseInt(resolvedParams.id) || 0
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

        {/* ✨ 2. 使用 ReactMarkdown 进行渲染 */}
        <div className="prose prose-invert prose-slate max-w-none 
          prose-headings:text-slate-100 
          prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-sky-500 prose-blockquote:bg-slate-900/50 prose-blockquote:px-4 prose-blockquote:py-1
          prose-code:text-emerald-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800
          prose-img:rounded-xl prose-img:shadow-lg
          prose-th:text-slate-200 prose-th:bg-slate-800/50 prose-th:p-3
          prose-td:p-3 prose-tr:border-b prose-tr:border-slate-800
        ">
           <ReactMarkdown remarkPlugins={[remarkGfm]}>
             {post.content}
           </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
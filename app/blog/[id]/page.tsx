import { getPostById } from '../../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
// ✨ 引入渲染库和插件
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

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
      <article className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Link href="/blog" className="inline-flex items-center gap-1 mb-8 text-sky-500 hover:text-sky-400 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          返回列表
        </Link>
        
        {/* 文章头部 */}
        <header className="mb-8 border-b border-slate-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-mono">
            <time>{post.createdAt.toLocaleString()}</time>
            {post.summary && <span className="text-slate-600">|</span>}
            {post.summary && <span>{post.summary}</span>}
          </div>
        </header>

        {/* ✨ 文章内容渲染区 ✨ */}
        {post.isMarkdown ? (
          // 🅰️ Markdown 渲染模式 (保留原有的 ReactMarkdown 代码)
          <div className="prose prose-invert prose-slate max-w-none 
            /* 标题样式 */
            prose-headings:text-slate-100 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-l-4 prose-h2:border-sky-500 prose-h2:pl-4
            /* 链接样式 */
            prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
            /* 引用样式 */
            prose-blockquote:border-l-sky-500 prose-blockquote:bg-slate-900/50 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:text-slate-400 prose-blockquote:not-italic
            /* 代码块样式 (由 rehype-highlight 处理颜色，这里处理容器) */
            prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:p-0
            /* 行内代码样式 */
            prose-code:text-sky-300 prose-code:bg-slate-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            /* 图片样式 */
            prose-img:rounded-xl prose-img:shadow-lg prose-img:border prose-img:border-slate-800
            /* 表格样式 */
            prose-table:border-collapse prose-table:border prose-table:border-slate-800
            prose-th:bg-slate-900 prose-th:text-slate-200 prose-th:p-4 prose-th:border prose-th:border-slate-800
            prose-td:p-4 prose-td:border prose-td:border-slate-800 prose-td:text-slate-400
            prose-tr:border-b prose-tr:border-slate-800
          ">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeHighlight]}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        ) : (
          // 🅱️ 纯文本渲染模式
          <div className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-slate-300">
            {post.content}
          </div>
        )}
      </article>
    </div>
  )
}
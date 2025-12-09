// app/blog/[id]/page.tsx
import { getPostById } from '../../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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

  const hasBgImage = !!post.backgroundImage
  
  return (
    <div 
      className="min-h-screen relative font-sans selection:bg-indigo-500/30"
      style={{
        backgroundImage: hasBgImage ? `url(${post.backgroundImage})` : 'none',
        backgroundColor: hasBgImage ? 'transparent' : '#0f172a',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {hasBgImage && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />}

      <div className="relative z-10 p-4 md:p-12">
        <article 
          className="max-w-4xl mx-auto rounded-3xl shadow-2xl p-8 md:p-12 transition-all"
          style={{
            // 👇 修复点：只保留这一行 color-mix 的定义，删掉了之前重复的那行
            backgroundColor: `color-mix(in srgb, ${post.contentBgColor || '#0f172a'}, transparent ${(1 - (post.contentBgOpacity ?? 0.8)) * 100}%)`
          } as React.CSSProperties}
        >
          <Link href="/blog" className="inline-flex items-center gap-1 mb-8 text-sky-400 hover:text-sky-300 text-sm transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            返回列表
          </Link>
          
          <header className="mb-10 border-b border-white/10 pb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight tracking-tight">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
              <time>{post.createdAt.toLocaleString()}</time>
              {post.summary && <span className="w-px h-4 bg-slate-600"/>}
              {post.summary && <span className="italic opacity-80">{post.summary}</span>}
            </div>
          </header>

          {post.isMarkdown ? (
            <div className="prose prose-invert prose-lg max-w-none 
              prose-headings:text-slate-100 
              prose-p:text-slate-300 prose-p:leading-8
              prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-sky-500 prose-blockquote:bg-black/20 prose-blockquote:px-6 prose-blockquote:py-2
              prose-pre:bg-[#0d1117]/80 prose-pre:backdrop-blur prose-pre:border prose-pre:border-white/10
              prose-img:rounded-2xl prose-img:shadow-lg
            ">
               <ReactMarkdown 
                 remarkPlugins={[remarkGfm]} 
                 rehypePlugins={[rehypeHighlight]}
                 components={{
                    a: ({ node, ...props }) => {
                      let { href, children } = props
                      if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto')) {
                        href = `https://${href}`
                      }
                      const isExternal = href?.startsWith('http') || href?.startsWith('//')
                      return (
                        <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
                          {children}
                        </a>
                      )
                    }
                 }}
               >
                 {post.content}
               </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-slate-300">
              {post.content}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
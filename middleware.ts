// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // 1. 定义受保护的路径
  if (req.nextUrl.pathname.startsWith('/admin')) {
    
    // 2. 获取请求头中的认证信息
    const basicAuth = req.headers.get('authorization')
    const url = req.nextUrl

    // 3. 这里的密码建议设复杂点，后面我们需要在 .env 里配置 ADMIN_PASSWORD
    // 格式必须是: Basic base64(user:password)
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      // 验证用户名(admin) 和 密码(从环境变量读取)
      if (user === 'admin' && pwd === process.env.ADMIN_PASSWORD) {
        return NextResponse.next()
      }
    }

    // 4. 如果认证失败，弹窗让用户输入
    url.pathname = '/api/auth'
    return new NextResponse('Auth Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}
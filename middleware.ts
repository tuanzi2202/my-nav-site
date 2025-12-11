// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // 1. 优先检查 Cookie (实现一次登录，处处通行)
  const isAdminCookie = req.cookies.get('is_admin')?.value === 'true'
  
  if (req.nextUrl.pathname.startsWith('/admin')) {
    
    // 如果 Cookie 存在且有效，直接放行，不再要求输入密码
    if (isAdminCookie) {
      return NextResponse.next()
    }

    // 2. 如果没有 Cookie，则进行 Basic Auth 验证
    const basicAuth = req.headers.get('authorization')
    const url = req.nextUrl

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')

      if (user === 'admin' && pwd === process.env.ADMIN_PASSWORD) {
        // ✨✨✨ 关键点：验证通过后，手动种下 Cookie ✨✨✨
        // 这样下次访问 /notes 或再次访问 /admin 就不用认证了
        const response = NextResponse.next()
        response.cookies.set('is_admin', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 7 天有效期
          path: '/'
        })
        return response
      }
    }

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
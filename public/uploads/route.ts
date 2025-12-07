// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const config = {
  api: {
    bodyParser: false, // 禁用默认解析器，由我们自己处理 formData
  },
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有检测到上传文件' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads/custom-bg')

    // 确保目录存在
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }

    const savedPaths: string[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      // 生成唯一文件名以防止覆盖 (时间戳 + 随机数 + 原始扩展名)
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.name)
      const filename = `bg-${uniqueSuffix}${ext}`
      const filepath = path.join(uploadDir, filename)
      
      await fs.writeFile(filepath, buffer)
      // 返回给前端的必须是以 / 开头的 public 相对路径
      savedPaths.push(`/uploads/custom-bg/${filename}`)
    }

    return NextResponse.json({ paths: savedPaths })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}
// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// 1. 添加链接
export async function addLink(formData: FormData) {
  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string

  if (!title || !url) return

  await prisma.link.create({
    data: {
      title,
      url,
      description,
      category: category || 'General',
    },
  })

  // 刷新页面数据，让新添加的内容立刻显示
  revalidatePath('/admin')
  revalidatePath('/') // 同时刷新首页
}

// 2. 删除链接
export async function deleteLink(formData: FormData) {
  const id = formData.get('id') as string

  if (!id) return

  await prisma.link.delete({
    where: { id: parseInt(id) },
  })

  revalidatePath('/admin')
  revalidatePath('/')
}
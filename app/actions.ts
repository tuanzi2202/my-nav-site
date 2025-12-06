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

  revalidatePath('/admin')
  revalidatePath('/')
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

// 3. ✨ 新增: 更新链接
export async function updateLink(formData: FormData) {
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string

  if (!id || !title || !url) return

  await prisma.link.update({
    where: { id: parseInt(id) },
    data: {
      title,
      url,
      description,
      category,
    },
  })

  // 只刷新数据，不跳转页面
  revalidatePath('/admin')
  revalidatePath('/')
}
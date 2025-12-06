// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// --- 链接管理 (保持不变) ---
export async function addLink(formData: FormData) {
  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const isRecommended = formData.get('isRecommended') === 'on'

  if (!title || !url) return

  await prisma.link.create({
    data: { title, url, description, category: category || 'General', isRecommended },
  })

  // ✨ 添加链接时，自动将新分类同步到 Category 表 (如果不存在)
  if (category) {
    const exists = await prisma.category.findUnique({ where: { name: category } })
    if (!exists) {
      await prisma.category.create({ data: { name: category, sortOrder: 0 } })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteLink(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return
  await prisma.link.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateLink(formData: FormData) {
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const isRecommended = formData.get('isRecommended') === 'on'

  if (!id || !title || !url) return

  await prisma.link.update({
    where: { id: parseInt(id) },
    data: { title, url, description, category, isRecommended },
  })
  
  // ✨ 更新时也同步分类
  if (category) {
    const exists = await prisma.category.findUnique({ where: { name: category } })
    if (!exists) {
      await prisma.category.create({ data: { name: category, sortOrder: 0 } })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/')
}

// --- ✨ 新增：分类管理动作 ---

// 1. 获取所有分类配置
export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { sortOrder: 'desc' } // 权重大的排前面
  })
}

// 2. 一键同步 (扫描 Link 表，把遗漏的分类补全)
export async function syncCategories() {
  // 获取所有用到的分类
  const groups = await prisma.link.groupBy({
    by: ['category'],
  })
  
  for (const group of groups) {
    const name = group.category
    const exists = await prisma.category.findUnique({ where: { name } })
    if (!exists) {
      await prisma.category.create({ data: { name, sortOrder: 0 } })
    }
  }
  
  revalidatePath('/admin')
}

// 3. 更新排序
export async function updateCategoryOrder(formData: FormData) {
  const id = formData.get('id') as string
  const sortOrder = formData.get('sortOrder') as string
  
  if (!id || !sortOrder) return

  await prisma.category.update({
    where: { id: parseInt(id) },
    data: { sortOrder: parseInt(sortOrder) }
  })

  revalidatePath('/admin')
  revalidatePath('/') // 刷新首页顺序
}

// 4. 删除分类配置 (只删配置，不删链接)
export async function deleteCategoryConfig(formData: FormData) {
  const id = formData.get('id') as string
  await prisma.category.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
}
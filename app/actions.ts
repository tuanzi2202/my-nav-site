// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// --- 基础链接管理 (保持不变) ---
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

  // ✨ 自动同步：添加时立即检查并创建分类
  await ensureCategoryExists(category)

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
  
  // ✨ 自动同步：更新时立即检查并创建分类
  await ensureCategoryExists(category)

  revalidatePath('/admin')
  revalidatePath('/')
}

// --- 分类管理 ---

// 辅助函数：确保分类存在
async function ensureCategoryExists(name: string) {
  if (!name) return
  const exists = await prisma.category.findUnique({ where: { name } })
  if (!exists) {
    // 新分类默认排在最后 (权重设为 -1 或 0)
    await prisma.category.create({ data: { name, sortOrder: 0 } })
  }
}

export async function getCategories() {
  // 按 sortOrder 降序排列 (数字越大越靠前)
  return await prisma.category.findMany({
    orderBy: { sortOrder: 'desc' } 
  })
}

// ✨ 自动同步所有分类 (查漏补缺)
export async function autoSyncCategories() {
  const groups = await prisma.link.groupBy({ by: ['category'] })
  let hasNew = false
  
  for (const group of groups) {
    const name = group.category
    const exists = await prisma.category.findUnique({ where: { name } })
    if (!exists) {
      await prisma.category.create({ data: { name, sortOrder: 0 } })
      hasNew = true
    }
  }
  
  if (hasNew) revalidatePath('/admin')
  return hasNew
}

// ✨ 批量更新排序 (拖拽后调用)
export async function reorderCategories(items: { id: number; sortOrder: number }[]) {
  // 使用事务并行处理，提高速度
  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  )
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteCategoryConfig(formData: FormData) {
  const id = formData.get('id') as string
  await prisma.category.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
}

// --- 全局配置管理 ---

// 更新公告
export async function updateAnnouncement(formData: FormData) {
  const content = formData.get('content') as string
  
  // 使用 upsert: 有则更新，无则创建
  await prisma.globalConfig.upsert({
    where: { key: 'announcement' },
    update: { value: content },
    create: { key: 'announcement', value: content }
  })

  revalidatePath('/admin')
  revalidatePath('/')
}

// 获取公告 (供服务端组件调用)
export async function getAnnouncement() {
  const config = await prisma.globalConfig.findUnique({
    where: { key: 'announcement' }
  })
  // 默认文案
  return config?.value || '欢迎来到 MyNav！这是默认公告，请去后台编辑。'
}
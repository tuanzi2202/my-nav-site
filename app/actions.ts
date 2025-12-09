// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// --- 链接管理 ---
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

  // 自动同步分类
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
  
  if (category) {
    const exists = await prisma.category.findUnique({ where: { name: category } })
    if (!exists) {
      await prisma.category.create({ data: { name: category, sortOrder: 0 } })
    }
  }

  revalidatePath('/admin')
  revalidatePath('/')
}

// --- 分类管理 ---
export async function getCategories() {
  return await prisma.category.findMany({ orderBy: { sortOrder: 'desc' } })
}

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

export async function reorderCategories(items: { id: number; sortOrder: number }[]) {
  await prisma.$transaction(
    items.map((item) => prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }))
  )
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteCategoryConfig(formData: FormData) {
  const id = formData.get('id') as string
  await prisma.category.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
}

// --- 公告管理 ---
export async function updateAnnouncement(formData: FormData) {
  const content = formData.get('content') as string
  
  await prisma.globalConfig.upsert({
    where: { key: 'announcement' },
    update: { value: content },
    create: { key: 'announcement', value: content }
  })

  if (content.trim()) {
    await prisma.announcementHistory.create({ data: { content } })
  }

  revalidatePath('/admin')
  revalidatePath('/')
}

export async function getAnnouncement() {
  const config = await prisma.globalConfig.findUnique({ where: { key: 'announcement' } })
  return config?.value || '欢迎来到 MyNav！'
}

export async function getAnnouncementHistory() {
  return await prisma.announcementHistory.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
}

// --- 智能主题管理 ---
export async function getSmartWallpapers() {
  return await prisma.smartWallpaper.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function addSmartWallpaper(formData: FormData) {
  const name = formData.get('name') as string
  const morning = formData.get('morning') as string
  const afternoon = formData.get('afternoon') as string
  const night = formData.get('night') as string

  if (!name) return

  await prisma.smartWallpaper.create({ data: { name, morning, afternoon, night } })
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteSmartWallpaper(formData: FormData) {
  const id = formData.get('id') as string
  await prisma.smartWallpaper.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateSmartWallpaper(formData: FormData) {
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const morning = formData.get('morning') as string
  const afternoon = formData.get('afternoon') as string
  const night = formData.get('night') as string

  if (!id || !name) return

  await prisma.smartWallpaper.update({
    where: { id: parseInt(id) },
    data: { name, morning, afternoon, night }
  })
  revalidatePath('/admin')
  revalidatePath('/')
}

// --- 全局 UI 配置 ---
export async function updateGlobalUISettings(formData: FormData) {
  const settings = {
    themeMode: formData.get('themeMode'),
    wallpaperSource: formData.get('wallpaperSource'),
    bgBlur: Number(formData.get('bgBlur')),
    cardOpacity: Number(formData.get('cardOpacity')),
    boardOpacity: Number(formData.get('boardOpacity')),
    uiBlur: Number(formData.get('uiBlur')),
    
    // ✨ 确保包含以下两个字段
    slideshowInterval: Number(formData.get('slideshowInterval')), 
    slideshowEffect: formData.get('slideshowEffect'),
    
    // ✨ 新增：保存点击特效
    clickEffect: formData.get('clickEffect'),
    
    descColor: formData.get('descColor'),
    
    noise: formData.get('noise') === 'on',
    glow: formData.get('glow') === 'on',
    tilt: formData.get('tilt') === 'on',
    customWallpapers: [], 
    activeThemeId: 'default'
  }

  await prisma.globalConfig.upsert({
    where: { key: 'ui_settings' },
    update: { value: JSON.stringify(settings) },
    create: { key: 'ui_settings', value: JSON.stringify(settings) }
  })

  revalidatePath('/')
  revalidatePath('/admin')
}

export async function getUISettings() {
  const config = await prisma.globalConfig.findUnique({ where: { key: 'ui_settings' } })
  if (!config) return null
  try { return JSON.parse(config.value) } catch (e) { return null }
}

// --- 博客系统管理 ---

// 1. 获取所有已发布文章 (前台列表页用)
export async function getPublishedPosts() {
  return await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' }
  })
}

// 2. 获取单篇文章 (详情页用) - ✅ 已修复参数校验问题
export async function getPostById(id: number) {
  // 安全检查：防止传入 NaN 或 undefined 导致数据库报错
  if (!id || isNaN(id)) return null;

  return await prisma.post.findUnique({
    where: { id }
  })
}

// 3. 发布新文章 (后台用)
export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const summary = formData.get('summary') as string
  // 默认勾选发布
  const published = formData.get('published') === 'on' 

  if (!title || !content) return

  await prisma.post.create({
    data: { title, content, summary, published }
  })
  
  revalidatePath('/blog')
  revalidatePath('/admin')
}

// 4. 删除文章 (后台用)
export async function deletePost(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return
  await prisma.post.delete({ where: { id: parseInt(id) } })
  revalidatePath('/blog')
  revalidatePath('/admin')
}
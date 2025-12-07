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
    slideshowInterval: Number(formData.get('slideshowInterval')),
    slideshowEffect: formData.get('slideshowEffect'),
    // ✨ 新增：描述颜色
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
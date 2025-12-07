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

// --- 智能壁纸主题管理 ---

export async function getSmartWallpapers() {
  return await prisma.smartWallpaper.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function addSmartWallpaper(formData: FormData) {
  const name = formData.get('name') as string
  const morning = formData.get('morning') as string
  const afternoon = formData.get('afternoon') as string
  const night = formData.get('night') as string

  if (!name) return

  await prisma.smartWallpaper.create({
    data: { name, morning, afternoon, night }
  })

  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteSmartWallpaper(formData: FormData) {
  const id = formData.get('id') as string
  await prisma.smartWallpaper.delete({ where: { id: parseInt(id) } })
  revalidatePath('/admin')
  revalidatePath('/')
}

// 更新智能主题
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

// --- ✨ UI 配置持久化 ---

export async function saveUISettings(settings: any) {
  // 将设置对象转为 JSON 字符串存入数据库
  await prisma.globalConfig.upsert({
    where: { key: 'ui_settings' },
    update: { value: JSON.stringify(settings) },
    create: { key: 'ui_settings', value: JSON.stringify(settings) }
  })
  // 这里不调用 revalidatePath，避免 slider 拖动时页面频繁闪烁
}

export async function getUISettings() {
  const config = await prisma.globalConfig.findUnique({
    where: { key: 'ui_settings' }
  })
  if (!config) return null
  try {
    return JSON.parse(config.value)
  } catch (e) {
    return null
  }
}

// ✨ 更新全局 UI 默认配置
export async function updateGlobalUISettings(formData: FormData) {
  // 解析表单数据
  const settings = {
    themeMode: formData.get('themeMode'),
    wallpaperSource: formData.get('wallpaperSource'),
    // 数值类型需要转换
    bgBlur: Number(formData.get('bgBlur')),
    cardOpacity: Number(formData.get('cardOpacity')),
    boardOpacity: Number(formData.get('boardOpacity')),
    uiBlur: Number(formData.get('uiBlur')),
    slideshowInterval: Number(formData.get('slideshowInterval')),
    slideshowEffect: formData.get('slideshowEffect'),
    // 布尔值处理
    noise: formData.get('noise') === 'on',
    glow: formData.get('glow') === 'on',
    tilt: formData.get('tilt') === 'on',
    // 保持一些不需要配置的字段默认值
    customWallpapers: [], 
    activeThemeId: 'default'
  }

  await prisma.globalConfig.upsert({
    where: { key: 'ui_settings' },
    update: { value: JSON.stringify(settings) },
    create: { key: 'ui_settings', value: JSON.stringify(settings) }
  })

  revalidatePath('/') // 刷新首页，让新用户立即看到效果
  revalidatePath('/admin')
}
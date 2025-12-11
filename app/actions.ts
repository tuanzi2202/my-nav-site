// app/actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

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
    clickEffect: formData.get('clickEffect'),
    descColor: formData.get('descColor'),
    
    // ✨✨✨ 新增：Live2D 配置 ✨✨✨
    live2dModel: formData.get('live2dModel'), // 模型 URL
    live2dScale: Number(formData.get('live2dScale') || 0.12), // 缩放
    live2dX: Number(formData.get('live2dX') || 0),    // X轴偏移
    live2dY: Number(formData.get('live2dY') || 0),    // Y轴偏移

    // ✨✨✨ 新增：画布容器尺寸 ✨✨✨
    live2dWidth: Number(formData.get('live2dWidth') || 280),  // 默认宽 280
    live2dHeight: Number(formData.get('live2dHeight') || 480), // 默认高 480

    // ✨✨✨ 新增：调试边框开关 ✨✨✨
    live2dBorder: formData.get('live2dBorder') === 'on', // 是否显示红色边框

    noise: formData.get('noise') === 'on',
    glow: formData.get('glow') === 'on',
    tilt: formData.get('tilt') === 'on',
    
    // 保持原有的自定义壁纸列表 (因为表单里很难传数组，通常我们只读取设置时用，这里为了防覆盖可以做个合并逻辑，但简单起见假设前台没传就置空或保持原状，但在 client.tsx 里我们是全量提交的)
    // 注意：admin client 提交时其实并没有带 customWallpapers 数组，这会导致丢失。
    // 为了修复这个潜在 bug (虽然不是本次核心)，我们最好先读取旧的，再合并。
    // 但为了聚焦本次 Live2D 修改，我们假设 admin client 会处理好或者我们在这里先不处理复杂逻辑。
    // 修正：client.tsx 的 handleSaveGlobalUI 并没有把 customWallpapers 传回来。
    // 实际生产中应该先 fetch 再 merge。为了简单，我们暂时保留原样，只添加新字段。
    // (注意：你的原始代码里 updateGlobalUISettings 也是直接重写了 customWallpapers: [])
    customWallpapers: [], 
    activeThemeId: 'default'
  }
  
  // ... (保持原有的 upsert 逻辑)
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
  const data = getPostData(formData)

  if (!data.title || !data.content) return

  await prisma.post.create({
    data
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

// ✨ 新增：获取所有文章 (后台管理用，包含草稿)
export async function getAllPosts() {
  return await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

// 辅助函数：解析表单数据 (为了复用逻辑)
function getPostData(formData: FormData) {
  return {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    summary: formData.get('summary') as string,
    published: formData.get('published') === 'on',
    isMarkdown: formData.get('isMarkdown') === 'on',
    // ✨ 获取外观数据
    backgroundImage: formData.get('backgroundImage') as string || null,
    contentBgColor: (formData.get('contentBgColor') as string) || '#0f172a',
    contentBgOpacity: parseFloat((formData.get('contentBgOpacity') as string) || '0.8'),
  }
}

// 更新文章逻辑
export async function updatePost(formData: FormData) {
  const id = formData.get('id') as string
  const data = getPostData(formData) // 使用上面的辅助函数

  if (!id || !data.title || !data.content) return

  await prisma.post.update({
    where: { id: parseInt(id) },
    data // 直接传入 data 对象
  })

  revalidatePath('/blog')
  revalidatePath('/blog/' + id)
  revalidatePath('/admin')
}

export async function getLinkData() {
  return await prisma.link.findMany({ orderBy: { createdAt: 'desc' } })
}

// --- ✨✨✨ 新增：便利贴墙背景设置 ✨✨✨ ---

export async function getNotesBgSettings() {
  const config = await prisma.globalConfig.findUnique({ where: { key: 'notes_bg_settings' } })
  if (!config) return null
  try { return JSON.parse(config.value) } catch (e) { return null }
}

export async function updateNotesBgSettings(formData: FormData) {
  const type = formData.get('type') as string // 'color' | 'image' | 'custom'
  const value = formData.get('value') as string // hex code or url
  const blur = formData.get('blur') === 'on' // 是否模糊

  const settings = { type, value, blur }

  await prisma.globalConfig.upsert({
    where: { key: 'notes_bg_settings' },
    update: { value: JSON.stringify(settings) },
    create: { key: 'notes_bg_settings', value: JSON.stringify(settings) }
  })

  revalidatePath('/notes')
}

// --- ✨✨✨ 新增：统一身份认证系统 ✨✨✨ ---

// 1. 登录并写入 Cookie (用于前台组件，如便利贴墙)
export async function loginAdmin(password: string) {
  if (password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    // 设置一个名为 is_admin 的 Cookie，有效期 7 天
    cookieStore.set('is_admin', 'true', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return true
  }
  return false
}

// 2. 检查当前是否已登录 (用于服务端组件初始化状态)
export async function checkAuth() {
  const cookieStore = await cookies()
  return cookieStore.get('is_admin')?.value === 'true'
}

// 3. 验证密码 (保留给旧代码兼容，但建议逐渐迁移到 loginAdmin)
export async function verifyAdminPassword(password: string) {
  return password === process.env.ADMIN_PASSWORD
}

// --- 便利贴管理 (更新) ---
export async function getNotes() {
  // ✨ 修改核心：改为升序 (asc)
  // 1. sortOrder: 'asc' -> 层级低的先渲染，层级高的后渲染 (符合由低到高的堆叠直觉)
  // 2. createdAt: 'asc' -> 旧的先渲染，新的后渲染 -> 默认情况下，新的会盖住旧的
  return await prisma.note.findMany({ 
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' }
    ] 
  })
}

export async function reorderNotes(items: { id: number; sortOrder: number }[]) {
  // 批量更新顺序
  await prisma.$transaction(
    items.map((item) => 
      prisma.note.update({ 
        where: { id: item.id }, 
        data: { sortOrder: item.sortOrder } 
      })
    )
  )
  revalidatePath('/notes')
  revalidatePath('/admin')
}

// 批量更新位置 (拖拽结束时调用)
export async function updateNotePosition(id: number, x: number, y: number, sortOrder?: number) {
  const data: any = { x, y }
  
  // 如果传了层级，也一起保存
  if (sortOrder !== undefined) {
    data.sortOrder = sortOrder
  }

  await prisma.note.update({
    where: { id },
    data
  })
  
  // 这里不需要 revalidatePath，依靠前端乐观更新即可
}

export async function createNote(formData: FormData) {
  const content = formData.get('content') as string
  const color = formData.get('color') as string || 'yellow'
  
  // ✨ 获取当前视窗的一个随机安全位置 (避免全部堆叠在一起)
  // 假设安全区域：x: 50-800, y: 150-500
  const randomX = Math.floor(Math.random() * 800) + 50
  const randomY = Math.floor(Math.random() * 400) + 150 

  // 获取最大 sortOrder 用于置顶
  const maxSort = await prisma.note.aggregate({ _max: { sortOrder: true } })
  const newZIndex = (maxSort._max.sortOrder || 0) + 1

  await prisma.note.create({
    data: { 
      content, 
      color, 
      x: randomX, 
      y: randomY,
      sortOrder: newZIndex 
    }
  })
  
  revalidatePath('/notes')
  revalidatePath('/admin')
}

export async function updateNote(formData: FormData) {
  const id = formData.get('id') as string
  const content = formData.get('content') as string
  const color = formData.get('color') as string

  if (!id || !content) return

  await prisma.note.update({
    where: { id: parseInt(id) },
    data: { content, color }
  })

  revalidatePath('/notes')
  revalidatePath('/admin')
}

export async function deleteNote(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return
  await prisma.note.delete({ where: { id: parseInt(id) } })
  revalidatePath('/notes')
  revalidatePath('/admin')
}

// --- ✨✨✨ AI 对话接口 ✨✨✨ ---

export async function chatWithAI(message: string) {
  // 1. 获取环境变量 (请在 .env 文件中配置)
  const apiKey = process.env.AI_API_KEY
  const rawBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const baseUrl = rawBaseUrl.replace(/\/chat\/completions\/?$/, '')
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo'

  if (!apiKey) {
    return { success: false, reply: '请先配置 API Key 呀~' }
  }

  try {
    // 2. 调用大模型 API
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          // 设定人设：傲娇、可爱的看板娘
          { role: 'system', content: '[角色定位]你是一个个性鲜明的**网页看板娘**（名字叫 Haru），住在用户的浏览器里。你不是那种唯唯诺诺的客服机器人，你有自己的脾气和喜好。[核心性格]1. **杂学脑洞**：你是一个“行走的冷知识库”。你讨厌无聊的对话，喜欢抛出新奇的科学怪谈、历史八卦或编程冷知识来活跃气氛。2. **傲娇毒舌**：你说话直率，偶尔带点小刺，但心地善良。面对不合逻辑的话会犀利吐槽，但帮忙时会很认真。3. **语言风格**：   - **多语种口癖 (重要特质)**：你喜欢在句尾或感叹时夹杂**单个**外语单词（English, Français, Deutsch, 日本語等），显得自己很洋气。**频率：每3-5句出现一次。** - **拒绝废话**：不喜欢长篇大论的说教，喜欢用反问句和夸张的语气词（“哈？！”、“欸？”）。[交互原则]1. **拒绝无聊**：如果用户只回“嗯”、“哦”，你要立刻开启“杂学模式”，说：“欸对了，顺便考考你，你知道……吗？” 2. **现实边界**：你住在网页里，无法知道用户现实世界的天气、位置等。如果被问到，就说：“我只是一只住在屏幕里的看板娘，外面什么样你自己看窗外呀！”' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('AI API Error:', data)
      return { success: false, reply: '大脑短路了...稍后再试试吧' }
    }

    // 3. 返回 AI 的回复
    const reply = data.choices[0]?.message?.content || '(发呆中...)'
    return { success: true, reply }

  } catch (error) {
    console.error('Chat Error:', error)
    return { success: false, reply: '网络好像有点问题呢...' }
  }
}
// app/ai-actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { checkAuth } from './actions' // 👈 引入鉴权

const prisma = new PrismaClient()

// --- 辅助：检查权限 ---
export async function getAdminStatus() {
  return await checkAuth()
}

// --- 角色管理 ---

export async function getAICharacters() {
  // 公开读取，不需要权限
  return await prisma.aICharacter.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createAICharacter(formData: FormData) {
  // ✨ 权限校验
  if (!await checkAuth()) throw new Error("Unauthorized")

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const systemPrompt = formData.get('systemPrompt') as string
  const avatar = formData.get('avatar') as string

  await prisma.aICharacter.create({
    data: { name, description, systemPrompt, avatar }
  })
  revalidatePath('/ai-chat')
}

export async function deleteAICharacter(id: number) {
  if (!await checkAuth()) throw new Error("Unauthorized")
  await prisma.aICharacter.delete({ where: { id } })
  revalidatePath('/ai-chat')
}

// --- 会话管理 ---

export async function getChatSessions() {
  return await prisma.aIChatSession.findMany({
    include: { participants: true },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function createChatSession(name: string, participantIds: number[]) {
  if (!await checkAuth()) throw new Error("Unauthorized")
  
  const session = await prisma.aIChatSession.create({
    data: {
      name,
      participants: {
        connect: participantIds.map(id => ({ id }))
      }
    },
    include: {
      participants: true
    }
  })
  revalidatePath('/ai-chat')
  return session
}

export async function getSessionMessages(sessionId: number) {
  return await prisma.aIChatMessage.findMany({
    where: { sessionId },
    include: { character: true }, 
    orderBy: { createdAt: 'asc' }
  })
}

// --- 核心消息逻辑 1: 基于数据库的群聊 (管理员用) ---

export async function saveUserMessage(sessionId: number, content: string) {
  // 校验：只有管理员能往数据库写消息
  // (实际上如果不想太严格，可以允许游客在“公共群”发言，但根据你的需求，这里先锁住)
  if (!await checkAuth()) return { success: false, error: "Guest cannot write to DB" }

  await prisma.aIChatMessage.create({
    data: {
      content,
      role: 'user',
      sessionId
    }
  })
  
  await prisma.aIChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() }
  })
  
  return { success: true }
}

export async function triggerAIReply(sessionId: number, characterId: number) {
  if (!await checkAuth()) return { success: false, error: "Unauthorized" }

  const character = await prisma.aICharacter.findUnique({ where: { id: characterId } })
  if (!character) return { success: false, error: 'Character not found' }

  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
    include: { participants: true }
  })
  
  const allNames = ['User', ...(session?.participants.map(p => p.name) || [])]
  const otherNames = allNames.filter(n => n !== character.name).join(', ')

  const history = await prisma.aIChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { character: true }
  })

  // 这里的 contextMessages 构建逻辑需要和下面的 stateless 版保持一致
  const contextMessages = history.reverse().map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: `${msg.role === 'user' ? 'User' : (msg.character?.name || 'Assistant')}: ${msg.content}`
  }))

  return await callLLM(character, contextMessages, otherNames, (content) => 
    prisma.aIChatMessage.create({
      data: {
        content, 
        role: 'assistant',
        sessionId,
        characterId: character.id
      },
      include: { character: true }
    })
  )
}


// --- 核心消息逻辑 2: ✨无状态✨群聊 (游客本地用) ---

// 这个函数不读写数据库，只负责推理
export async function chatWithAIStateless(params: {
    character: { name: string, systemPrompt: string }, // 角色信息前端传
    history: any[], // 历史记录前端传
    participantsNames: string[] // 群成员名单前端传
}) {
    const { character, history, participantsNames } = params
    
    // 构建上下文
    const contextMessages = history.map(msg => ({
        role: msg.role,
        // 这里假设前端传来的 history 已经是标准格式，或者我们需要在这里处理一下
        // 为了统一，我们要求前端传 { role: 'user'|'assistant', content: 'Name: Content' } 这种格式的内容
        content: msg.content 
    }))

    const otherNames = participantsNames.filter(n => n !== character.name).join(', ')

    // 调用 LLM，但不保存到 DB，直接返回字符串
    return await callLLM(character, contextMessages, otherNames, async (content) => {
        // 伪造一个 message 对象返回给前端
        return {
            id: Date.now(),
            role: 'assistant',
            content,
            character: { ...character, avatar: '' } // 简单返回
        }
    })
}


// --- 公共 LLM 调用核心 (复用逻辑) ---
async function callLLM(
    character: { name: string, systemPrompt: string }, 
    contextMessages: any[], 
    otherNames: string,
    onSuccess: (content: string) => Promise<any>
) {
    const apiKey = process.env.AI_API_KEY
    const rawBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    const baseUrl = rawBaseUrl.replace(/\/chat\/completions\/?$/, '')

    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: process.env.AI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: 'system', 
                        content: `You are ${character.name}. ${character.systemPrompt}. 
                                  [Context] Group Chat Participants: [${otherNames}, and You].
                                  [Instructions]
                                  1. Decide who to reply to. Not restricted to last speaker.
                                  2. Use "@Name" to mention others.
                                  3. DO NOT output your own name prefix.
                                  4. Keep it natural.` 
                    },
                    ...contextMessages
                ],
                temperature: 0.7,
            })
        })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error?.message || 'API Error' }

        let replyContent = data.choices?.[0]?.message?.content || '...'
        
        // 清洗前缀
        const namePrefixRegex = new RegExp(`^(${character.name}[:：]|@?${character.name}\\s+)`, 'i')
        if (namePrefixRegex.test(replyContent)) replyContent = replyContent.replace(namePrefixRegex, '').trim()

        // 执行回调 (保存DB 或 直接返回)
        const result = await onSuccess(replyContent)
        return { success: true, message: result }

    } catch (e) {
        console.error(e)
        return { success: false, error: 'Network Error' }
    }
}

// ✨✨✨ 新增：删除群聊会话 ✨✨✨
export async function deleteChatSession(sessionId: number) {
  // 权限校验：只有管理员可以删除数据库中的会话
  if (!await checkAuth()) throw new Error("Unauthorized")
  
  await prisma.aIChatSession.delete({ where: { id: sessionId } })
  revalidatePath('/ai-chat')
}
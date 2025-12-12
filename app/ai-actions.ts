// app/ai-actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// --- 角色管理 ---
export async function getAICharacters() {
  return await prisma.aICharacter.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createAICharacter(formData: FormData) {
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
  const session = await prisma.aIChatSession.create({
    data: {
      name,
      participants: {
        connect: participantIds.map(id => ({ id }))
      }
    }
  })
  revalidatePath('/ai-chat')
  return session
}

export async function getSessionMessages(sessionId: number) {
  return await prisma.aIChatMessage.findMany({
    where: { sessionId },
    include: { character: true }, // 获取发言角色的头像和名字
    orderBy: { createdAt: 'asc' }
  })
}

// --- 核心：发送消息并触发 AI 轮询 ---

// 1. 保存用户消息
export async function saveUserMessage(sessionId: number, content: string) {
  await prisma.aIChatMessage.create({
    data: {
      content,
      role: 'user',
      sessionId
    }
  })
  
  // 更新会话时间
  await prisma.aIChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() }
  })
  
  return { success: true }
}

// 2. 触发特定角色的回复
export async function triggerAIReply(sessionId: number, characterId: number) {
  const character = await prisma.aICharacter.findUnique({ where: { id: characterId } })
  if (!character) return { success: false, error: 'Character not found' }

  // 获取上下文历史 (最近 20 条，避免 token 爆炸)
  const history = await prisma.aIChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { character: true }
  })

  // 构建消息链
  // 我们需要把群聊的历史格式化为 AI 能理解的文本
  // 比如： User: xxx \n ExpertAI: xxx \n CriticAI: xxx
  const contextMessages = history.reverse().map(msg => {
    const name = msg.role === 'user' ? 'User' : (msg.character?.name || 'Assistant')
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: `${name}: ${msg.content}` // 将名字带入内容，让 AI 知道是谁说的
    }
  })

  // 调用 AI 接口 (复用你现有的逻辑或 fetch)
  // 这里需要从 globalConfig 获取 API Key，或者为了演示直接读 env
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // 或从设置中读取
        messages: [
          // 系统提示词：定义当前角色的身份，并告知它正在一个群聊中
          { role: 'system', content: `You are ${character.name}. ${character.systemPrompt}. \nCurrently you are in a group chat. Reply to the latest message or the general discussion.` },
          ...contextMessages
        ],
        temperature: 0.7,
      })
    })

    const data = await res.json()
    const replyContent = data.choices?.[0]?.message?.content || '...'

    // 保存回复
    const savedMsg = await prisma.aIChatMessage.create({
      data: {
        content: replyContent,
        role: 'assistant',
        sessionId,
        characterId: character.id
      },
      include: { character: true }
    })

    return { success: true, message: savedMsg }

  } catch (e) {
    console.error(e)
    return { success: false, error: 'API Error' }
  }
}
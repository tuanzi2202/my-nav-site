// app/ai-actions.ts
'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const prisma = new PrismaClient()

// --- 角色管理 (Character Management) ---

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

// --- 会话管理 (Session Management) ---

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

// --- 消息处理核心逻辑 (Core Messaging Logic) ---

// 1. 保存用户消息
export async function saveUserMessage(sessionId: number, content: string) {
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

// 2. 触发 AI 回复 (核心修改版)
export async function triggerAIReply(sessionId: number, characterId: number) {
  // 1. 获取当前需要发言的角色
  const character = await prisma.aICharacter.findUnique({ where: { id: characterId } })
  if (!character) return { success: false, error: 'Character not found' }

  // 2. 获取会话详情，整理群成员名单 (用于 AI 智能 @其他人)
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
    include: { participants: true }
  })
  
  // 生成名单字符串，例如: "User, 激进派AI, 保守派AI"
  // 排除掉当前发言 AI 自己的名字
  const allNames = ['User', ...(session?.participants.map(p => p.name) || [])]
  const otherNames = allNames.filter(n => n !== character.name).join(', ')

  // 3. 获取历史记录 (作为上下文 Context)
  const history = await prisma.aIChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { character: true }
  })

  // 格式化历史记录供 AI 阅读 (Name: Content)
  const contextMessages = history.reverse().map(msg => {
    const name = msg.role === 'user' ? 'User' : (msg.character?.name || 'Assistant')
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: `${name}: ${msg.content}` 
    }
  })

  // 4. 准备 API 调用
  const apiKey = process.env.AI_API_KEY
  // 自动去除 URL 末尾可能多余的后缀，防止双重拼接
  const rawBaseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const baseUrl = rawBaseUrl.replace(/\/chat\/completions\/?$/, '')

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          // 系统提示词：定义人设 + 群聊规则 + 智能@规则
          { 
            role: 'system', 
            content: `You are ${character.name}. ${character.systemPrompt}. 
                      
                      [Context]
                      You are in a group chat. 
                      Participants list: [${otherNames}, and You].
                      The chat history provided below is in 'SpeakerName: Message' format for your reference only.
                      
                      [Instructions]
                      1. Analyze the chat history to decide who to reply to. You are NOT restricted to the last speaker.
                      2. If you want to address specific person(s), mention them like "@Name" at the beginning or middle of your sentence.
                      3. IMPORTANT: DO NOT prefix your response with your own name (e.g. do NOT say "${character.name}: ..."). Just output your speech directly.
                      4. Keep it natural, conversational and concise.` 
          },
          ...contextMessages
        ],
        temperature: 0.7,
      })
    })

    const data = await res.json()

    // 错误检查
    if (!res.ok) {
        console.error("AI API Error:", data)
        return { success: false, error: data.error?.message || 'API Error' }
    }

    // 5. 获取回复并进行清洗
    // 使用 let 以便修改
    let replyContent = data.choices?.[0]?.message?.content || '...'

    // 正则清洗：防止 AI 不听话带上了 "Name:" 前缀
    // 同时也清洗掉 AI 误把自己当做目标 @ 了的情况 (比如 "@Myself ...")
    const namePrefixRegex = new RegExp(`^(${character.name}[:：]|@?${character.name}\\s+)`, 'i')
    
    if (namePrefixRegex.test(replyContent)) {
        replyContent = replyContent.replace(namePrefixRegex, '').trim()
    }

    // 6. 保存到数据库
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
    console.error("Network/Server Error:", e)
    return { success: false, error: 'Network Request Failed' }
  }
}
// backup.ts
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('⏳ 正在连接 Vercel 数据库并拉取数据...')

  // 1. 获取所有数据
  const [links, categories] = await Promise.all([
    prisma.link.findMany(),
    prisma.category.findMany()
  ])

  // 2. 组装数据
  const backupData = {
    timestamp: new Date().toLocaleString(),
    stats: {
      links: links.length,
      categories: categories.length
    },
    data: {
      links,
      categories
    }
  }

  // 3. 生成文件名 (例如: backup-2023-10-27.json)
  const dateStr = new Date().toISOString().split('T')[0]
  const fileName = `backup-${dateStr}.json`
  const savePath = path.join(__dirname, fileName)

  // 4. 写入本地文件
  fs.writeFileSync(savePath, JSON.stringify(backupData, null, 2))

  console.log(`✅ 备份成功！`)
  console.log(`📂 文件已保存为: ${fileName}`)
  console.log(`📊 包含: ${links.length} 个链接, ${categories.length} 个分类`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 备份失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  // 1. 读取刚才保存的 JSON 文件
  const dataPath = path.join(__dirname, '../websites_data.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const websites = JSON.parse(rawData)

  console.log(`🚀 开始导入 ${websites.length} 条数据...`)

  // 2. 循环插入数据库
  // 我们使用 createMany 批量插入，速度更快
  await prisma.link.createMany({
    data: websites.map((site: any) => ({
      title: site.title,
      url: site.url,
      category: site.category,
      description: site.description || "从旧站导入", // 如果没描述，给个默认值
    })),
    skipDuplicates: true, // 如果有重复的 URL，跳过
  })

  console.log(`✅ 数据导入成功！`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
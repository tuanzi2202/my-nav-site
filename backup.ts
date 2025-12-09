// backup.ts
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 辅助函数：将 PascalCase (Link) 转为 camelCase (link) 以调用 prisma.link
const toCamelCase = (str: string) => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

async function main() {
  console.log('⏳ 正在全量备份数据库 (自动扫描所有表)...')

  // 1. 获取所有模型名称 (如 ['Link', 'Category', 'Post', ...])
  // Prisma.ModelName 是 Prisma 自动生成的枚举，包含所有表名
  const modelNames = Object.keys(Prisma.ModelName)
  
  const allData: Record<string, any[]> = {}
  const stats: Record<string, number> = {}

  // 2. 动态遍历所有模型并抓取数据
  for (const modelKey of modelNames) {
    const modelName = modelKey as keyof typeof Prisma.ModelName
    // 转换为 prisma 客户端的方法名 (例如 Post -> prisma.post)
    const delegateName = toCamelCase(modelName)
    
    // @ts-ignore - 我们知道这个属性存在，但 TS 静态类型推断不出来动态调用
    const delegate = prisma[delegateName]

    if (delegate && typeof delegate.findMany === 'function') {
      const records = await delegate.findMany()
      allData[modelName] = records
      stats[modelName] = records.length
      console.log(`   ✓ [${modelName}] 已备份 ${records.length} 条数据`)
    }
  }

  // 3. 组装最终 JSON
  const backupPayload = {
    timestamp: new Date().toLocaleString(),
    meta: {
      version: "2.0 (Dynamic)",
      totalModels: modelNames.length
    },
    stats,
    data: allData // 结构变更为: { Link: [...], Post: [...], ... }
  }

  // 4. 写入文件
  const dateStr = new Date().toISOString().split('T')[0]
  const fileName = `backup-full-${dateStr}.json`
  const savePath = path.join(__dirname, fileName)

  fs.writeFileSync(savePath, JSON.stringify(backupPayload, null, 2))

  console.log(`\n✅ 全量备份成功！`)
  console.log(`📂 文件保存为: ${fileName}`)
}

main()
  .catch(e => {
    console.error('❌ 备份失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
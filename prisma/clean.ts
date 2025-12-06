// prisma/clean.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 开始清理旧数据描述...')

  // 批量更新
  const result = await prisma.link.updateMany({
    where: {
      description: "从旧站导入" // 🎯 锁定目标：只修改包含这句话的记录
    },
    data: {
      description: "" // ✂️ 执行操作：设为空字符串
    }
  })

  console.log(`✅ 清理完成！共修改了 ${result.count} 条数据。`)
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
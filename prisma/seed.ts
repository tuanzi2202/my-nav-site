// prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 辅助函数：转驼峰命名 (Post -> post)
const toCamelCase = (str: string) => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

async function main() {
  // 👇👇👇 每次恢复前，只需要修改这一行 👇👇👇
  const backupFileName = 'backup-full-2025-12-09.json' 
  // 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

  const dataPath = path.join(__dirname, `../${backupFileName}`)

  // 1. 文件校验
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ 错误：找不到文件 ${backupFileName}`)
    console.error(`   请确认文件名是否正确，且文件位于项目根目录。`)
    process.exit(1)
  }

  // 2. 读取数据
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const backup = JSON.parse(rawData)
  const datasets = backup.data // 结构: { Link: [], Post: [], ... }

  console.log(`🚀 正在从 [${backupFileName}] 恢复数据...`)

  // 3. 动态遍历所有模型 (无需手动维护模型列表)
  const modelNames = Object.keys(datasets)

  for (const modelName of modelNames) {
    const records = datasets[modelName]
    if (!records || records.length === 0) continue

    const delegateName = toCamelCase(modelName)
    // @ts-ignore: 动态调用 Prisma 方法
    const delegate = prisma[delegateName]

    if (delegate && typeof delegate.createMany === 'function') {
      process.stdout.write(`⏳ 恢复 [${modelName}]: ${records.length} 条... `)
      try {
        await delegate.createMany({
          data: records,
          skipDuplicates: true // 跳过已存在的数据，防止主键冲突
        })
        console.log(`✅ OK`)
      } catch (e) {
        console.log(`❌ 失败`)
        console.warn(e)
      }
    } else {
      console.warn(`⚠️ 跳过 [${modelName}]: 无法自动处理`)
    }
  }

  console.log(`\n🎉 恢复工作结束！`)
}

main()
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
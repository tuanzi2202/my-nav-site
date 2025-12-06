// app/page.tsx
import { PrismaClient } from '@prisma/client'
import ClientHome from './components/ClientHome'

export const dynamic = 'force-dynamic'
const prisma = new PrismaClient()

interface Props {
  searchParams: Promise<{ category?: string; query?: string }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams
  const currentCategory = searchParams.category || 'Recommended'
  const searchQuery = searchParams.query || ''
  
  // 1. 获取分类统计
  const rawCategories = await prisma.link.groupBy({
    by: ['category'],
    _count: { category: true }
  })

  // 2. 获取分类排序配置
  const categoryConfigs = await prisma.category.findMany()
  const sortMap = new Map(categoryConfigs.map(c => [c.name, c.sortOrder]))

  // 3. 排序分类
  const categoriesData = rawCategories.sort((a, b) => {
    const scoreA = sortMap.get(a.category) || 0
    const scoreB = sortMap.get(b.category) || 0
    if (scoreA !== scoreB) return scoreB - scoreA
    return b._count.category - a._count.category
  })

  // 4. 构建 Link 查询条件
  const whereCondition: any = {}
  if (searchQuery) {
    whereCondition.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { url: { contains: searchQuery, mode: 'insensitive' } },
    ]
  } else {
    if (currentCategory === 'Recommended') {
      whereCondition.isRecommended = true
    } else if (currentCategory !== 'All') {
      whereCondition.category = currentCategory
    }
  }

  const links = await prisma.link.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' }
  })

  // 5. 传递给客户端组件
  return (
    <ClientHome 
      links={links} 
      categoriesData={categoriesData} 
      currentCategory={currentCategory}
      searchQuery={searchQuery}
    />
  )
}
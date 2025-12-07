// app/page.tsx
import { PrismaClient } from '@prisma/client'
import ClientHome from './components/ClientHome'
// ✨ 引入新写的 getUISettings
import { getAnnouncement, getSmartWallpapers, getUISettings } from './actions'

export const dynamic = 'force-dynamic'
const prisma = new PrismaClient()

interface Props {
  searchParams: Promise<{ category?: string; query?: string }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams
  const currentCategory = searchParams.category || 'Recommended'
  const searchQuery = searchParams.query || ''
  
  const rawCategories = await prisma.link.groupBy({ by: ['category'], _count: { category: true } })
  const categoryConfigs = await prisma.category.findMany()
  const sortMap = new Map(categoryConfigs.map(c => [c.name, c.sortOrder]))

  const categoriesData = rawCategories.sort((a, b) => {
    const scoreA = sortMap.get(a.category) || 0
    const scoreB = sortMap.get(b.category) || 0
    if (scoreA !== scoreB) return scoreB - scoreA
    return b._count.category - a._count.category
  })

  const whereCondition: any = {}
  if (searchQuery) {
    whereCondition.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { url: { contains: searchQuery, mode: 'insensitive' } },
    ]
  } else {
    if (currentCategory === 'Recommended') { whereCondition.isRecommended = true }
    else if (currentCategory !== 'All') { whereCondition.category = currentCategory }
  }

  // ✨ 并行获取所有数据，包括 UI 设置
  const [links, announcement, smartThemes, uiSettings] = await Promise.all([
      prisma.link.findMany({ where: whereCondition, orderBy: { createdAt: 'desc' } }),
      getAnnouncement(),
      getSmartWallpapers(),
      getUISettings()
  ])

  return (
    <ClientHome 
      links={links} 
      categoriesData={categoriesData} 
      currentCategory={currentCategory}
      searchQuery={searchQuery}
      announcement={announcement}
      smartThemes={smartThemes}
      initialSettings={uiSettings} // ✨ 注入数据库里的设置
    />
  )
}
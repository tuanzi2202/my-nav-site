// app/page.tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function Home() {
  // 直接在服务端获取数据
  const links = await prisma.link.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    
      
        
          My Navigator
        
      
      
      
        {links.map((link) => (
          
            {link.title}
            {link.description}
            
              {link.category}
            
          
        ))}
      
    
  )
}
'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function Live2D() {
  // 初始化配置
  useEffect(() => {
    // 你可以在这里进行一些自定义的初始化逻辑
    // 但 autoload.js 通常会自动处理大部分事情
    
    // 监听 storage 事件，以便在其他标签页修改设置时同步（可选）
    const handleStorage = () => {
      // 可以在这里处理 waifu-display 的状态
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <>
      {/* 加载 font-awesome 图标库 (看板娘的工具栏需要) */}
      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/css/all.min.css"
      />
      
      {/* 加载看板娘自动脚本 */}
      <Script 
        src="https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('✨ 看板娘已加载完成')
        }}
      />
    </>
  )
}
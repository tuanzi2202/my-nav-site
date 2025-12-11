// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Live2D from "./components/Live2D"; 
import { getUISettings } from "./actions"; // 👈 引入获取设置的函数

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oasis - 您的数字绿洲",
  description: "个人专属导航站，汇聚优质资源",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✨ 获取设置
  const uiSettings = await getUISettings()

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* ✨ 将设置传递给组件 */}
        <Live2D settings={uiSettings} /> 
      </body>
    </html>
  );
}
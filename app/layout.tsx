import type React from "react"
import type { Metadata } from "next"
import ClientLayout from "./ClientLayout"
import "./globals.css"

export const metadata: Metadata = {
  title: "PDF Craft Pro - Premium Document Processing",
  description: "Convert PDFs in seconds with our premium glassmorphic interface",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ClientLayout>{children}</ClientLayout>
}

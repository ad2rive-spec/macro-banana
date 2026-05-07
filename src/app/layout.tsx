import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Macro Banana',
  description: 'AI Image & Video Generation Studio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js" strategy="beforeInteractive" />
      </head>
      <body className="flex flex-col h-full overflow-hidden" suppressHydrationWarning>
        <ToastProvider>
          <Navbar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}

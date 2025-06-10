import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { CustomAlertProvider } from '@/components/custom-alert'
import { CustomConfirmProvider } from '@/components/custom-confirm'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hệ thống chấm công',
  description: 'Ứng dụng quản lý và chấm công nhân viên',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <CustomConfirmProvider>
          <CustomAlertProvider>
        <main>{children}</main>
        <Toaster />
          </CustomAlertProvider>
        </CustomConfirmProvider>
      </body>
    </html>
  )
}

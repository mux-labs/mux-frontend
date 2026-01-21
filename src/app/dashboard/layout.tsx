import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard Layout',
  description: 'Global dashboard layout implementation',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  )
}
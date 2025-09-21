import type { Metadata } from 'next'
import { Inter, Rubik } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })
const rubik = Rubik({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rubik'
})

export const metadata: Metadata = {
  title: 'Sledování budovy',
  description: 'Aplikace pro sledování počtu lidí v budově',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs">
      <body className={`${inter.className} ${rubik.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
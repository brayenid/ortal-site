import './globals.css'
import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { Providers } from './providers'
import { getOffice } from '@/lib/site'
import { Poppins } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import { TawkWidget } from '@/components/TawkWidget'
import SocialLinks from '@/components/SocialLinks'
import SkipToArticles from '@/components/SkipToArticles'

export const revalidate = 300

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900']
})

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authConfig)
  const office = await getOffice()
  return (
    <html lang="id">
      <body className={`min-h-screen flex flex-col ${poppins.className}`}>
        <SkipToArticles />
        <NextTopLoader />
        <Providers>
          <Navbar session={session} office={office ?? undefined} />
          <main className="flex-1">{children}</main>
        </Providers>
        <footer className="border-t border-slate-200 text-center">
          <div className="container py-6 text-sm text-slate-600 space-y-4">
            <div className="flex justify-center w-full">
              <SocialLinks scheme="light" size="md" />
            </div>
            <p>
              © {new Date().getFullYear()} Bagian Organisasi Kutai Barat - <br />
              Dikembangkan Oleh Tim Bagian Organisasi
            </p>
          </div>
        </footer>
        <TawkWidget />
      </body>
    </html>
  )
}

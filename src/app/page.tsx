export const dynamic = 'force-dynamic'
import type { Metadata, Viewport } from 'next'
import { ArticleList } from '@/components/ArticleList'
import { FAQ } from '@/components/FAQ'
import Jumbotron from '@/components/Jumbotron'
import SkmCta from '@/components/SkmCta'
import { TeamChips } from '@/components/Team'
import { VideoList } from '@/components/VideoList'
import { BannerCarousel } from '@/components/BannerCarousel'
import LinksShowcase from '@/components/LinksShowcase'

const SITE_NAME = 'Bagian Organisasi Kutai Barat'
const SITE_DESC = 'Selamat datang di website Bagian Organisasi Kutai Barat'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const OG_IMAGE = '/ortal-bg.jpeg'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: ['Bagian Organisasi', 'Kutai Barat', 'Pemkab', 'Artikel', 'FAQ', 'Profil', 'Informasi Publik'],
  category: 'government',
  referrer: 'origin-when-cross-origin',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: SITE_NAME,
    description: SITE_DESC,
    siteName: SITE_NAME,
    locale: 'id_ID',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
    images: [OG_IMAGE]
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    other: [{ rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#0ea5e9' }]
  },
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1
    }
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light',
  themeColor: '#ffffff'
}

export default function HomePage() {
  return (
    <div>
      <Jumbotron />
      <BannerCarousel />
      <LinksShowcase variant="card" color="primary" descLines="full" size="lg" iconPosition="left" columns={2} />
      <TeamChips className="mb-14 container" />
      <div id="main" tabIndex={-1} aria-label="Daftar artikel">
        <ArticleList title="Artikel Terbaru" />
      </div>
      <VideoList
        title="Video Terbaru"
        limit={6}
        showViewAll
        viewAllHref="https://www.youtube.com/@bagianorganisasikutaibarat3988"
      />
      <FAQ />
      <SkmCta
        href="https://docs.google.com/forms/d/e/1FAIpQLSdbdigLhYffuN8tmyleUKNimLpsB03keka6Eag9Dqk31Hoomw/viewform?usp=sharing&ouid=111692972392715404214"
        external
      />
    </div>
  )
}

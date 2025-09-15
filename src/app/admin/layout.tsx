import type { Metadata } from 'next'

const SITE_NAME = 'Dashboard Admin'
const SITE_DESC = 'Sistem Manajemen Konten'

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESC,
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    type: 'website',
    locale: 'id_ID'
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESC
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

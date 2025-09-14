import { Metadata } from 'next'
import BookmarksClient from './BookmarksClient'

export const dynamic = 'force-dynamic'

const SITE_NAME = 'Bagian Organisasi - Artikel Tersimpan'
const SITE_DESC = 'Selamat datang di website Bagian Organisasi Kutai Barat'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESC
}

export default function Page() {
  return <BookmarksClient />
}

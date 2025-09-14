import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

const SITE_NAME = 'Dashboard Admin'
const SITE_DESC = 'Sistem Manajemen Konten'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESC
}

export default async function AdminHome() {
  const session = await getServerSession(authConfig)
  if (!session?.user) redirect('/login')
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { href: '/admin/artikel', label: 'Kelola Artikel' },
          { href: '/admin/kategori', label: 'Kelola Kategori' },
          { href: '/admin/pegawai', label: 'Kelola Pegawai' },
          { href: '/admin/profile', label: 'Profil Kantor' },
          { href: '/admin/faq', label: 'Kelola FAQ' },
          { href: '/admin/jumbotron', label: 'Jumbotron' },
          { href: '/admin/video', label: 'Kelola Video' },
          { href: '/admin/tim', label: 'Tim Kerja' }
        ].map((i) => (
          <Link key={i.href} href={i.href} className="card hover:shadow-md transition">
            <div className="text-lg font-semibold">{i.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

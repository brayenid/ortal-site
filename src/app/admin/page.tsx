import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  FileText,
  Tags,
  Users,
  Building2,
  HelpCircle,
  Sparkles,
  Video,
  Users2,
  Image as ImageIcon,
  ChevronRight,
  Link as Links,
  User,
  Newspaper
} from 'lucide-react'

const SITE_NAME = 'Dashboard Admin'
const SITE_DESC = 'Sistem Manajemen Konten'

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESC
}

export default async function AdminHome() {
  const session = await getServerSession(authConfig)
  if (!session?.user) redirect('/login')

  const items = [
    { href: '/admin/artikel', label: 'Kelola Artikel', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/kategori', label: 'Kelola Kategori', icon: Tags, color: 'bg-emerald-50 text-emerald-600' },
    { href: '/admin/pegawai', label: 'Kelola Pegawai', icon: Users, color: 'bg-fuchsia-50 text-fuchsia-600' },
    { href: '/admin/profile', label: 'Profil Kantor', icon: Building2, color: 'bg-cyan-50 text-cyan-600' },
    { href: '/admin/faq', label: 'Kelola FAQ', icon: HelpCircle, color: 'bg-amber-50 text-amber-700' },
    { href: '/admin/jumbotron', label: 'Jumbotron', icon: Sparkles, color: 'bg-violet-50 text-violet-600' },
    { href: '/admin/video', label: 'Kelola Video', icon: Video, color: 'bg-rose-50 text-rose-600' },
    { href: '/admin/tim', label: 'Tim Kerja', icon: Users2, color: 'bg-teal-50 text-teal-600' },
    { href: '/admin/banner', label: 'Banner', icon: ImageIcon, color: 'bg-sky-50 text-sky-600' },
    { href: '/admin/links', label: 'Daftar Tautan', icon: Links, color: 'bg-rose-50 text-rose-600' },
    { href: '/admin/users', label: 'Daftar Akun', icon: User, color: 'bg-lime-50 text-lime-600' },
    { href: '/admin/comments', label: 'Daftar Komentar', icon: Newspaper, color: 'bg-red-50 text-red-600' }
  ] as const

  return (
    <div className="container py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-sm text-slate-600">Kelola konten situs dengan cepat dan konsisten.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
          {session.user.email}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="card group relative transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={label}>
            <div className="flex items-center gap-4">
              <div className={`grid size-12 place-items-center rounded-2xl ${color}`}>
                <Icon size={22} />
              </div>

              <div className="min-w-0">
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-slate-500">Buka {label.toLowerCase()}</div>
              </div>

              <div className="ml-auto text-slate-400 transition-transform group-hover:translate-x-0.5">
                <ChevronRight size={18} />
              </div>
            </div>

            {/* subtle gradient highlight on hover */}
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: 'radial-gradient(60% 60% at 10% 10%, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 60%)'
              }}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

type Props = {
  /** Judul seksi di atas grid */
  title?: string
  /** Batas jumlah item (default 6) */
  limit?: number
  /** Pencarian sederhana pada judul/deskripsi (opsional) */
  q?: string
  /** Tampilkan link “Lihat semua” di header */
  showViewAll?: boolean
  /** URL tujuan link “Lihat semua” (default: /video) */
  viewAllHref?: string
  /**
   * Link kartu diarahkan ke mana:
   * - 'youtube' (default) = buka URL YouTube di tab baru
   * - 'page' = ke halaman internal /video/[id]
   */
  linkTo?: 'youtube' | 'page'
  className?: string
}

type VideoLite = {
  id: string
  title: string
  url: string
  thumbnailUrl: string | null
  description: string | null
  createdAt: Date
}

/** Ekstraksi ID YouTube (fallback untuk thumbnail) */
const YT_ID = /^[A-Za-z0-9_-]{11}$/
function parseYouTubeIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] ?? ''
      return YT_ID.test(id) ? id : null
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v') ?? ''
        return YT_ID.test(id) ? id : null
      }
      const parts = u.pathname.split('/').filter(Boolean)
      const maybeId = parts[1] ?? ''
      return YT_ID.test(maybeId) ? maybeId : null
    }
    return null
  } catch {
    return null
  }
}

export async function VideoList({
  title = 'Video Terbaru',
  limit = 6,
  q,
  showViewAll = false,
  viewAllHref = '/video',
  linkTo = 'youtube',
  className = ''
}: Props) {
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } }
        ]
      }
    : undefined

  const items = (await prisma.video.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, limit)
  })) as VideoLite[]

  return (
    <section className={`container py-10 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold !m-0">{title}</h2>
        {showViewAll ? (
          <Link target="_blank" href={viewAllHref} className="text-sm text-primary hover:underline">
            Lihat semua
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="card text-slate-600">Belum ada video.</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((v) => {
            const ytId = parseYouTubeIdFromUrl(v.url)
            const thumb = v.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '')
            const href = linkTo === 'page' ? `/video/${v.id}` : v.url
            const external = linkTo !== 'page'

            return (
              <Link
                key={v.id}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="card hover:shadow-md transition-shadow block">
                {thumb ? (
                  <div className="relative aspect-video mb-3">
                    <Image src={thumb} alt={v.title} fill className="rounded-xl object-cover" />
                  </div>
                ) : null}
                <h3 className="font-semibold line-clamp-2">{v.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <time dateTime={v.createdAt.toISOString()}>
                    {v.createdAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </time>
                </p>
                {v.description ? <p className="text-sm text-slate-600 mt-2 line-clamp-2">{v.description}</p> : null}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

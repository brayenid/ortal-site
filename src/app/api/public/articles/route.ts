import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'

const MAX_SLUGS = 50

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    // Terima ?slugs=a,b,c atau ?slugs=a&slugs=b atau ?slug=a&slug=b
    const raw = [...url.searchParams.getAll('slugs'), ...url.searchParams.getAll('slug')]
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!raw.length) {
      return NextResponse.json([], { headers: cacheHeaders() })
    }

    // unik + batasi
    const slugs = Array.from(new Set(raw)).slice(0, MAX_SLUGS)

    const rows = await prisma.article.findMany({
      where: { published: true, slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } }
      }
    })

    // urutkan sesuai urutan input
    const order = new Map(slugs.map((s, i) => [s, i]))
    rows.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))

    // caching: ETag & Last-Modified
    const latestMs = rows.reduce((max, r) => Math.max(max, (r.updatedAt ?? r.createdAt).getTime()), 0)
    const etag = makeETag(slugs, latestMs)

    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders(etag, latestMs) })
    }

    const body = rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      coverImageUrl: a.coverImageUrl,
      createdAt: a.createdAt.toISOString(),
      category: a.category ? { name: a.category.name, slug: a.category.slug } : null
    }))

    return NextResponse.json(body, { headers: cacheHeaders(etag, latestMs) })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengambil artikel' }, { status: 500 })
  }
}

/* ---------- helpers ---------- */

function cacheHeaders(etag?: string, lastMs?: number) {
  const h: Record<string, string> = {
    // Cache di CDN 5 menit, izinkan stale 10 menit
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    Vary: 'Accept-Encoding'
  }
  if (etag) h.ETag = etag
  if (lastMs) h['Last-Modified'] = new Date(lastMs).toUTCString()
  return h
}

function makeETag(slugs: string[], latestMs: number) {
  const sig = createHash('sha1')
    .update(slugs.join(',') + ':' + latestMs)
    .digest('hex')
  return `"w-${sig}"` // weak ETag
}

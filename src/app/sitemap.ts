import type { MetadataRoute } from 'next'
import { prisma } from '../lib/prisma'

/** Regenerasi sitemap tiap 1 hari (sesuaikan kebutuhan) */
export const revalidate = 60 * 60 * 24

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Ambil data yang perlu diindeks
  const [articles, categories, teams] = await Promise.all([
    prisma.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.category.findMany({
      select: { slug: true, updatedAt: true, createdAt: true },
      orderBy: { name: 'asc' }
    }),
    prisma.team.findMany({
      select: { id: true, updatedAt: true, createdAt: true },
      orderBy: { name: 'asc' }
    })
  ])

  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    {
      url: new URL('/', BASE_URL).toString(),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: new URL('/profil', BASE_URL).toString(),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: new URL('/artikel', BASE_URL).toString(),
      lastModified: articles[0]?.updatedAt ?? now,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: new URL('/tim', BASE_URL).toString(),
      lastModified: teams[0]?.updatedAt ?? now,
      changeFrequency: 'weekly',
      priority: 0.6
    }
  ]

  // Artikel detail
  entries.push(
    ...articles.map((a) => ({
      url: new URL(`/artikel/${a.slug}`, BASE_URL).toString(),
      lastModified: a.updatedAt ?? a.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.9
    }))
  )

  // Halaman listing per kategori (pakai query ?cat=slug — boleh di sitemap)
  entries.push(
    ...categories.map((c) => ({
      url: new URL(`/artikel?cat=${encodeURIComponent(c.slug)}`, BASE_URL).toString(),
      lastModified: c.updatedAt ?? c.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6
    }))
  )

  // Tim detail
  entries.push(
    ...teams.map((t) => ({
      url: new URL(`/tim/${t.id}`, BASE_URL).toString(),
      lastModified: t.updatedAt ?? t.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5
    }))
  )

  return entries
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slugsParam = url.searchParams.get('slugs') // "a,b,c"
  const slugs = (slugsParam || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!slugs.length) return NextResponse.json([], { status: 200 })

  const rows = await prisma.article.findMany({
    where: { published: true, slug: { in: slugs } },
    include: { category: true }
  })

  // urutkan sesuai urutan slugs
  const order = new Map(slugs.map((s, i) => [s, i]))
  rows.sort((a, b) => order.get(a.slug)! - order.get(b.slug)!)

  return NextResponse.json(
    rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      coverImageUrl: a.coverImageUrl,
      createdAt: a.createdAt,
      category: a.category ? { name: a.category.name, slug: a.category.slug } : null
    })),
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

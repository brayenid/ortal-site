// src/app/artikel/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { ArticleCard } from '@/components/ArticleCard'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function ArtikelPage({ searchParams }: PageProps) {
  const q = typeof searchParams?.q === 'string' ? searchParams!.q.trim() : ''
  const cat = typeof searchParams?.cat === 'string' ? searchParams!.cat.trim() : '' // ⬅️ kategori (slug/teks)
  const pageParam = typeof searchParams?.page === 'string' ? searchParams!.page : '1'
  const perParam = typeof searchParams?.per === 'string' ? searchParams!.per : '9'

  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const perPageRaw = Math.max(1, parseInt(perParam || '9', 10) || 9)
  const perPage = Math.min(perPageRaw, 30)

  // build filter
  const where = {
    published: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { content: { contains: q, mode: 'insensitive' as const } }
          ]
        }
      : {}),
    ...(cat
      ? {
          // match slug persis ATAU nama mengandung (case-insensitive)
          category: {
            is: {
              OR: [{ slug: cat }, { name: { contains: cat, mode: 'insensitive' as const } }]
            }
          }
        }
      : {})
  } as const

  const total = await prisma.article.count({ where })

  const skip = (page - 1) * perPage
  const take = perPage

  const [articles, categories] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } })
  ])

  // helper untuk link kategori: jaga q, reset page
  const buildHref = (cslug?: string) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (cslug) p.set('cat', cslug)
    return `/artikel${p.toString() ? `?${p.toString()}` : ''}`
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Semua Artikel</h1>
        <SearchBar placeholder="Cari judul atau isi artikel…" className="w-full max-w-96 !text-gray-700" />
      </div>

      {/* Filter kategori (scrollable pills) */}
      <div className="mb-4 -mx-2 overflow-x-auto no-scrollbar">
        <div className="px-2 flex items-center gap-2">
          <Link
            href={buildHref(undefined)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              !cat ? 'bg-primary text-white border-primary' : 'border-slate-300 text-slate-700 hover:border-slate-400'
            }`}>
            Semua
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref(c.slug)}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                cat === c.slug
                  ? 'bg-primary text-white border-primary'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="card">
          <div className="text-slate-600">
            {q || cat ? (
              <>
                Tidak ada hasil
                {q && (
                  <>
                    {' '}
                    untuk <strong>“{q}”</strong>
                  </>
                )}
                {cat && (
                  <>
                    {' '}
                    pada kategori <strong>“{cat}”</strong>
                  </>
                )}
                .
              </>
            ) : (
              'Belum ada artikel.'
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((a, i) => (
            <ArticleCard article={a} key={i} />
          ))}
        </div>
      )}

      <Pagination total={total} page={page} perPage={perPage} className="justify-center" />
    </div>
  )
}

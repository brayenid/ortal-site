import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ShareBox from '@/components/ShareBox'
import Breadcrumbs, { type Crumb } from '@/components/Breadcrumbs'
import Link from 'next/link'
import BookmarkButton from '@/components/BookmarkButton'
import DisqusThread from '@/components/Disqus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageParams = { params: Promise<{ slug: string }> }

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function getArticle(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    include: { category: true }
  })
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
    const { slug } = await params // ⬅️ penting
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        published: true,
        excerpt: true,
        content: true,
        coverImageUrl: true,
        category: { select: { name: true, slug: true } }
      }
    })

    if (!article || !article.published) {
      return { title: 'Artikel tidak ditemukan', robots: { index: false, follow: false } }
    }

    const title = article.title
    const descRaw =
      stripHtml(article.excerpt || article.content || '').slice(0, 160) ||
      (article.category?.name ? `Kategori: ${article.category.name}` : 'Artikel')
    const image = article.coverImageUrl || undefined
    const pathname = `/artikel/${article.slug}`

    return {
      title,
      description: descRaw,
      metadataBase: new URL(BASE_URL),
      alternates: { canonical: pathname },
      openGraph: {
        title,
        description: descRaw,
        url: new URL(pathname, BASE_URL).toString(),
        siteName: 'Bagian Organisasi Kutai Barat',
        type: 'article',
        locale: 'id_ID',
        images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: descRaw,
        images: image ? [image] : undefined
      },
      robots: { index: true, follow: true }
    }
  } catch {
    return { title: 'Artikel', description: 'Detail artikel', robots: { index: false, follow: false } }
  }
}

export default async function ArtikelDetailPage({ params }: PageParams) {
  const { slug } = await params // ⬅️ penting
  const article = await getArticle(slug)
  if (!article || !article.published) return notFound()

  // Artikel terkait (prioritas kategori)
  let related = await prisma.article.findMany({
    where: {
      published: true,
      id: { not: article.id },
      ...(article.categoryId ? { categoryId: article.categoryId } : {})
    },
    select: { id: true, title: true, slug: true, coverImageUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  if (!related.length) {
    related = await prisma.article.findMany({
      where: { published: true, id: { not: article.id } },
      select: { id: true, title: true, slug: true, coverImageUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  }

  const canonical = new URL(`/artikel/${article.slug}`, BASE_URL).toString()
  const dateStr = new Date(article.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })

  // Breadcrumbs
  const crumbs: Crumb[] = [
    { name: 'Beranda', href: '/' },
    { name: 'Artikel', href: '/artikel' },
    { name: article.title }
  ]

  return (
    <div className="container py-8 pt-2 sm:pt-8">
      <div className="grid lg:grid-cols-12 gap-8">
        {/* MAIN */}
        <main className="lg:col-span-8 min-w-0">
          <Breadcrumbs items={crumbs} maxItemWidth={88} />
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-2">{article.title}</h1>

            {article.category?.slug && (
              <Link
                href={`/artikel?cat=${encodeURIComponent(article.category.slug)}`}
                className="text-blue-600 hover:underline">
                #{article.category.name ?? 'Umum'}
              </Link>
            )}

            <p className="text-sm text-slate-500">{dateStr}</p>
            {/* ⬇️ Tombol Bookmark */}
            <div className="ml-auto flex justify-end">
              <BookmarkButton slug={article.slug} />
            </div>
          </div>

          {article.coverImageUrl && (
            <div className="relative aspect-[16/9] mb-6">
              <Image
                src={article.coverImageUrl}
                alt={article.title}
                title={article.title}
                fill
                className="rounded-xl object-cover"
                sizes="(min-width: 768px) 66vw, 100vw"
                priority
              />
            </div>
          )}

          <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
          <div className="my-10 border-t pt-10">
            <DisqusThread
              key={article.id}
              identifier={article.id} // atau article.slug (asal konsisten)
              title={article.title}
              url={canonical}
            />
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 ">
          <div className="sticky top-20 space-y-12">
            {/* Artikel Terkait */}
            <div>
              <div className="font-semibold mb-3">Artikel Lain</div>
              {related.length ? (
                <ul className="space-y-3 list-none p-0">
                  {related.map((r) => (
                    <li key={r.id} className="border-l-4 border-blue-300 rounded p-2">
                      <Link href={`/artikel/${r.slug}`} className="group flex gap-3">
                        <span className="leading-snug line-clamp-2 group-hover:underline">{r.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">Belum ada artikel terkait.</div>
              )}
            </div>

            {/* Share */}
            <ShareBox title={article.title} url={canonical} />
          </div>
        </aside>
      </div>
    </div>
  )
}

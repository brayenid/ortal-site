import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { ArticleCard } from './ArticleCard'

type Props = {
  categorySlug?: string
  title: string
  limit?: number
}

export async function ArticleList({ categorySlug, title, limit = 6 }: Props) {
  const where = {
    published: true,
    ...(categorySlug ? { category: { slug: categorySlug } } : {})
  }
  const articles = await prisma.article.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  return (
    <section className="container py-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold !p-0 !m-0">{title}</h2>
        <Link href="/artikel" className="text-sm text-primary hover:underline">
          Lihat semua
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {articles.map((a, i) => (
          <ArticleCard article={a} key={i} />
        ))}
        {articles.length === 0 && <div className="text-slate-500">Belum ada artikel.</div>}
      </div>
    </section>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export function ArticleCard({ article }: { article: any }) {
  return (
    <>
      <Link key={article.id} href={`/artikel/${article.slug}`} className="card hover:shadow-md transition-shadow">
        {article.coverImageUrl && (
          <div className="relative aspect-[16/9] mb-3">
            <Image src={article.coverImageUrl} alt={article.title} fill className="rounded-xl object-cover" />
          </div>
        )}
        <p className="text-sm text-blue-500">#{article.category?.name ?? 'Umum'}</p>
        <h3 className="font-semibold my-2">{article.title}</h3>
        <time dateTime={article.createdAt.toISOString()} className="text-xs text-slate-500">
          {article.createdAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </time>
      </Link>
    </>
  )
}

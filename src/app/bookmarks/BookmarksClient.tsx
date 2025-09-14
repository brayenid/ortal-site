'use client'

import { useBookmarks } from '@/hooks/useBookmarks'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Item = {
  id: string
  slug: string
  title: string
  coverImageUrl?: string | null
  createdAt: string | Date
  category?: { name: string; slug: string } | null
}

export default function BookmarksClient() {
  const { hydrated, list, remove, clear } = useBookmarks()
  const [items, setItems] = useState<Item[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    if (!list.length) {
      setItems([])
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const q = encodeURIComponent(list.join(','))
        const res = await fetch(`/api/public/articles?slugs=${q}`, { cache: 'no-store' })
        const data = (await res.json()) as Item[]
        setItems(data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [hydrated, list])

  const empty = hydrated && (items?.length ?? 0) === 0

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg sm:text-xl font-bold">Artikel Tersimpan</h1>
        {!!items?.length && (
          <button className="btn btn-outline" onClick={clear}>
            Bersihkan semua
          </button>
        )}
      </div>

      {!hydrated || loading ? (
        <div className="text-slate-500">Memuat…</div>
      ) : empty ? (
        <div className="card">
          <p className="text-slate-600">
            Belum ada bookmark. Jelajahi{' '}
            <Link href="/artikel" className="text-primary underline">
              artikel
            </Link>{' '}
            dan simpan yang kamu suka.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {items!.map((a) => (
            <div key={a.id} className="card hover:shadow-md transition-shadow group">
              <Link href={`/artikel/${a.slug}`}>
                {a.coverImageUrl && (
                  <div className="relative aspect-[16/9] mb-3">
                    <Image src={a.coverImageUrl} alt={a.title} fill className="rounded-xl object-cover" />
                  </div>
                )}
                <div className="text-xs text-slate-500">{a.category?.name ?? 'Umum'}</div>
                <h3 className="font-semibold line-clamp-2">{a.title}</h3>
              </Link>

              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => remove(a.slug)}
                  aria-label="Hapus dari bookmark">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

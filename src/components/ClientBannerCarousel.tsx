'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type BannerLite = { id: string; title: string; description?: string | null; linkUrl?: string | null; imageUrl: string }

export default function ClientBannerCarousel({ banners }: { banners: BannerLite[] }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 9000)
    return () => clearInterval(t)
  }, [banners.length])

  const go = (i: number) => setIdx((i + banners.length) % banners.length)

  return (
    <section className="relative container py-8">
      <div className="relative overflow-hidden rounded-xl">
        <div className="flex transition-transform duration-700" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {banners.map((b) => (
            <div key={b.id} className="min-w-full">
              <div className="relative aspect-[4/1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
                  <h2 className="text-lg sm:text-2xl font-bold drop-shadow">{b.title}</h2>
                  {b.description && <p className="text-sm sm:text-base opacity-95 line-clamp-2">{b.description}</p>}
                  {b.linkUrl && (
                    <Link
                      href={b.linkUrl}
                      className="inline-block mt-3 btn !bg-white !text-slate-900 hover:!bg-slate-100">
                      Lihat
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {banners.length > 1 ? (
          <>
            {/* Nav */}
            <button
              type="button"
              aria-label="Prev"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
              onClick={() => go(idx - 1)}>
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
              onClick={() => go(idx + 1)}>
              ›
            </button>

            {/* Dots */}
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`size-2.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        ) : (
          ''
        )}
      </div>
    </section>
  )
}

'use client'

import { useEffect, useState, PropsWithChildren } from 'react'
import Link from 'next/link'

type BannerLite = {
  id: string
  title: string
  description?: string | null
  linkUrl?: string | null
  imageUrl: string
}

function SlideLink({ href, children, title }: PropsWithChildren<{ href?: string | null; title: string }>) {
  // kalau tidak ada link → cuma div biasa
  if (!href) return <div className="block">{children}</div>

  const isInternal = href.startsWith('/') || href.startsWith('#')
  return isInternal ? (
    <Link
      href={href}
      aria-label={title}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {children}
    </Link>
  ) : (
    <a
      href={href}
      aria-label={title}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {children}
    </a>
  )
}

export default function ClientBannerCarousel({ banners }: { banners: BannerLite[] }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 9000)
    return () => clearInterval(t)
  }, [banners.length])

  const go = (i: number) => {
    if (!banners.length) return
    setIdx((i + banners.length) % banners.length)
  }

  if (!banners.length) return null

  return (
    <section className="relative container py-6">
      <div className="relative overflow-hidden rounded-xl">
        <div className="flex transition-transform duration-700" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {banners.map((b) => (
            <div key={b.id} className="min-w-full">
              <SlideLink href={b.linkUrl ?? undefined} title={b.title}>
                <div className="relative aspect-[3/1] sm:aspect-[4/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white pointer-events-none">
                    <h2 className="text-sm sm:text-2xl font-bold drop-shadow">{b.title}</h2>
                    {b.description && <p className="text-sm sm:text-base opacity-95 line-clamp-2">{b.description}</p>}
                    {/* Tidak ada tombol. Seluruh banner clickable jika linkUrl ada. */}
                  </div>
                </div>
              </SlideLink>
            </div>
          ))}
        </div>

        {banners.length > 1 && (
          <>
            {/* Nav */}
            <button
              type="button"
              aria-label="Sebelumnya"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2 z-20"
              onClick={() => go(idx - 1)}>
              ‹
            </button>
            <button
              type="button"
              aria-label="Berikutnya"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 text-white p-2 z-20"
              onClick={() => go(idx + 1)}>
              ›
            </button>

            {/* Dots */}
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`size-2 sm:size-2.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

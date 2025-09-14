'use client'

import { useEffect, useRef, useState, PropsWithChildren } from 'react'
import Link from 'next/link'

type BannerLite = {
  id: string
  title: string
  description?: string | null
  linkUrl?: string | null
  imageUrl: string
}

function SlideLink({
  href,
  children,
  title,
  suppressClick
}: PropsWithChildren<{ href?: string | null; title: string; suppressClick?: boolean }>) {
  const onClick: React.MouseEventHandler<HTMLAnchorElement | HTMLDivElement> = (e) => {
    if (suppressClick) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  if (!href)
    return (
      <div className="block" onClick={onClick}>
        {children}
      </div>
    )

  const isInternal = href.startsWith('/') || href.startsWith('#')
  return isInternal ? (
    <Link
      href={href}
      aria-label={title}
      onClick={onClick}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      {children}
    </Link>
  ) : (
    <a
      href={href}
      aria-label={title}
      onClick={onClick}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      target="_blank"
      rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default function ClientBannerCarousel({ banners }: { banners: BannerLite[] }) {
  const [idx, setIdx] = useState(0)

  // ====== autoplay
  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 9000)
    return () => clearInterval(t)
  }, [banners.length])

  const go = (i: number) => {
    if (!banners.length) return
    setIdx((i + banners.length) % banners.length)
  }

  // ====== drag / swipe
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const widthRef = useRef(0)
  const startXRef = useRef(0)
  const draggingRef = useRef(false)
  const [dragPx, setDragPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const didDragRef = useRef(false)

  // measure width
  useEffect(() => {
    const measure = () => {
      widthRef.current = wrapperRef.current?.clientWidth ?? 0
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const THRESHOLD_RATIO = 0.18 // geser > 18% lebar → ganti slide
  const CLICK_SUPPRESS_PX = 6 // >6px dianggap drag, jangan klik link

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!widthRef.current) widthRef.current = wrapperRef.current?.clientWidth ?? 0
    draggingRef.current = true
    setDragging(true)
    didDragRef.current = false
    startXRef.current = e.clientX
    trackRef.current?.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!draggingRef.current) return
    const delta = e.clientX - startXRef.current
    if (Math.abs(delta) > CLICK_SUPPRESS_PX) didDragRef.current = true

    // beri sedikit resistensi saat di ujung
    const width = widthRef.current || 1
    const atEdge = (idx === 0 && delta > 0) || (idx === banners.length - 1 && delta < 0)
    const eased = atEdge ? delta * 0.35 : delta
    setDragPx(eased)
  }

  const endDrag = () => {
    if (!draggingRef.current) return
    const width = widthRef.current || 1
    const ratio = dragPx / width

    if (ratio <= -THRESHOLD_RATIO) go(idx + 1)
    else if (ratio >= THRESHOLD_RATIO) go(idx - 1)

    draggingRef.current = false
    setDragging(false)
    setDragPx(0)
  }

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => endDrag()
  const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = () => endDrag()
  const onPointerLeave: React.PointerEventHandler<HTMLDivElement> = () => endDrag()

  if (!banners.length) return null

  // transform pakai px saat drag agar halus; saat tidak drag pakai translateX(-idx * width)
  const translatePx = -(idx * (widthRef.current || 0)) + dragPx
  const trackStyle: React.CSSProperties = dragging
    ? { transform: `translate3d(${translatePx}px,0,0)` }
    : { transform: `translateX(-${idx * 100}%)` }

  return (
    <section className="relative container py-6">
      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-xl select-none"
        style={{ touchAction: 'pan-y' }} // izinkan scroll vertikal, kita handle geser horizontal
      >
        <div
          ref={trackRef}
          className={`flex ${dragging ? '' : 'transition-transform duration-700'}`}
          style={trackStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
          aria-live="polite">
          {banners.map((b) => (
            <div key={b.id} className="min-w-full">
              <SlideLink href={b.linkUrl ?? undefined} title={b.title} suppressClick={didDragRef.current}>
                <div className="relative aspect-[2/1] sm:aspect-[4/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white pointer-events-none">
                    <h2 className="text-sm sm:text-2xl font-bold drop-shadow">{b.title}</h2>
                    {b.description && <p className="text-sm sm:text-base opacity-95 line-clamp-2">{b.description}</p>}
                    {/* seluruh slide bisa diklik jika ada linkUrl */}
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
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-black/40 hover:bg-black/60 text-white p-2 px-4 z-20"
              onClick={() => go(idx - 1)}>
              ‹
            </button>
            <button
              type="button"
              aria-label="Berikutnya"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/40 hover:bg-black/60 text-white p-2 px-4 z-20"
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

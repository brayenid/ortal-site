'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SignInOutButton } from './SignInOutButton'
import type { Session } from 'next-auth'
import { Office } from '@/lib/site'

type Props = {
  session: Session | null
  office?: Office
  /** Untuk mode beranda saja: 1 = 100vh, 0.5 = 50vh (kalau pakai tinggi layar) */
  triggerVH?: number
}

export function Navbar({ session, office, triggerVH = 1 }: Props) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  // di home: mulai dari false (transparan), selain home: true (mode scrolled / putih)
  const [scrolled, setScrolled] = useState<boolean>(!isHome)
  const [open, setOpen] = useState(false)

  // jalankan listener scroll HANYA di halaman home
  useEffect(() => {
    if (!isHome) {
      setScrolled(true)
      return
    }

    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight

    const calc = () => {
      // PILIH SALAH SATU: pakai tinggi layar (uncomment 2 baris di bawah) ATAU threshold px 200
      // const vh = Math.max(1, getViewportHeight())
      // const thresholdPx = Math.max(0, triggerVH) * vh
      // setScrolled(window.scrollY >= thresholdPx)

      setScrolled(window.scrollY >= 200) // threshold px
    }

    calc()
    window.addEventListener('scroll', calc, { passive: true })
    window.addEventListener('resize', calc)
    window.visualViewport?.addEventListener('resize', calc)
    return () => {
      window.removeEventListener('scroll', calc)
      window.removeEventListener('resize', calc)
      window.visualViewport?.removeEventListener('resize', calc as any)
    }
  }, [isHome, triggerVH])

  // tutup menu saat ganti halaman / Esc
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const links = [
    { href: '/profil', label: 'Profil' },
    { href: '/artikel', label: 'Artikel' },
    { href: '/bookmarks', label: 'Tersimpan' },
    ...(session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR' ? [{ href: '/admin', label: 'Admin' }] : [])
  ]

  // posisi: home=fixed, selain home=sticky
  const positionClass = isHome ? 'fixed' : 'sticky'
  const baseNav = isHome
    ? scrolled
      ? 'bg-white border-b border-gray-300'
      : 'bg-transparent'
    : 'bg-white border-b border-gray-300'

  const brandClass = isHome ? (scrolled ? 'text-slate-900' : 'text-white') : 'text-slate-900'
  const linkCls = (href: string) => {
    const active = pathname === href
    if (isHome) {
      return scrolled
        ? active
          ? 'text-primary font-semibold'
          : 'text-slate-700 hover:text-slate-900'
        : active
        ? 'text-white font-semibold'
        : 'text-white/90 hover:text-white'
    }
    return active ? 'text-primary font-semibold' : 'text-slate-700 hover:text-slate-900'
  }

  const mobilePanelBg = isHome && !scrolled ? 'bg-black/70 backdrop-blur' : 'bg-white border-t border-gray-200'
  const mobileLinkText = isHome && !scrolled ? 'text-white' : 'text-slate-800'

  return (
    <nav className={`${positionClass} top-0 z-50 w-full transition-colors ${baseNav}`}>
      <div className="container flex items-center justify-between gap-12 py-3">
        {/* Brand */}
        <Link href="/" className={`font-bold text-lg flex items-center gap-3 ${brandClass}`}>
          {office?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={office.logoUrl} alt={office.name} className="w-9 rounded" />
          ) : null}
          <span className="truncate text-base sm:text-lg">{office?.name ?? 'Website Kantor'}</span>
        </Link>

        {/* Links desktop */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`transition-colors ${linkCls(l.href)}`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto hidden lg:block">
          <SignInOutButton variant={isHome && !scrolled ? 'on-dark' : 'on-light'} />
        </div>

        {/* Hamburger (mobile) */}
        <button
          type="button"
          className={`lg:hidden rounded-xl p-2 transition-colors ${
            isHome && !scrolled ? 'text-white/90 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Buka menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className={`lg:hidden ${mobilePanelBg}`}>
          <div className="container py-3 flex flex-col gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`py-2 text-base ${mobileLinkText} ${
                  pathname === l.href ? 'font-semibold !text-primary' : ''
                }`}
                onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className={`my-2 h-px ${isHome && !scrolled ? 'bg-white/20' : 'bg-gray-200'}`} />
            <div className="py-2">
              <SignInOutButton variant={isHome && !scrolled ? 'on-dark' : 'on-light'} />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

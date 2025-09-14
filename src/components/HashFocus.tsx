'use client'

import { useEffect } from 'react'

export default function HashFocus({ targetId }: { targetId: string }) {
  useEffect(() => {
    const tryFocus = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.replace(/^#/, '')
      if (hash !== targetId) return
      const el = document.getElementById(targetId) as HTMLElement | null
      if (!el) return
      // pastikan bisa fokus
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      el.focus({ preventScroll: false })
    }

    // fokus saat mount (mis. datang dari / via Link ke /artikel#artikel-list)
    tryFocus()
    // fokus saat hash diubah di halaman yang sama
    window.addEventListener('hashchange', tryFocus)
    return () => window.removeEventListener('hashchange', tryFocus)
  }, [targetId])

  return null
}

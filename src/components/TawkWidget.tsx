'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void
      minimize?: () => void
      toggle?: () => void
      hideWidget?: () => void
      showWidget?: () => void
      endChat?: () => void
      onLoad?: () => void
    }
    Tawk_LoadStart?: Date
  }
}

export const TawkWidget = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // jangan inject dua kali
    if (document.getElementById('tawk-script')) return

    window.Tawk_LoadStart = new Date()

    const s1 = document.createElement('script')
    s1.id = 'tawk-script'
    s1.async = true
    s1.src = 'https://embed.tawk.to/68c55ac43c57f819275d577a/1j51el4k5'
    s1.charset = 'UTF-8'
    s1.setAttribute('crossorigin', '*')

    const s0 = document.getElementsByTagName('script')[0]
    s0.parentNode?.insertBefore(s1, s0)

    return () => {
      // optional cleanup
      s1.remove()
      document.querySelectorAll('iframe').forEach((iframe) => {
        if (iframe.src.includes('tawk.to')) iframe.remove()
      })
    }
  }, [])

  return null // widget tampil otomatis
}

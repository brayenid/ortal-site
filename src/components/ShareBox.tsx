'use client'

import { useEffect, useState } from 'react'

type Props = {
  title: string
  url: string
}

export default function ShareBox({ title, url }: Props) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false) // ⬅️ hindari baca navigator saat render SSR

  useEffect(() => {
    // dijalankan di klien setelah mount → aman
    setCanShare(typeof navigator !== 'undefined' && !!(navigator as any).share)
  }, [])

  const doShare = async () => {
    try {
      if (canShare && (navigator as any).share) {
        await (navigator as any).share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      // user cancel / ignore
    }
  }

  const open = (u: string) => window.open(u, '_blank', 'noopener,noreferrer')

  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  return (
    <div>
      <div className="font-semibold mb-3">Bagikan</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn !bg-gray-700 hover:!bg-gray-800" onClick={doShare}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M7.5 18A5.5 5.5 0 0 1 2 12.5A5.5 5.5 0 0 1 7.5 7H18a4 4 0 0 1 4 4a4 4 0 0 1-4 4H9.5A2.5 2.5 0 0 1 7 12.5A2.5 2.5 0 0 1 9.5 10H17v1.5H9.5a1 1 0 0 0-1 1a1 1 0 0 0 1 1H18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 18 8.5H7.5a4 4 0 0 0-4 4a4 4 0 0 0 4 4H17V18z"
            />
          </svg>
        </button>
        <button type="button" className="btn !bg-green-500 hover:!bg-green-600" onClick={() => open(wa)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18c.21-.58.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.16.25-.64.81-.78.97c-.15.17-.29.19-.53.07c-.26-.13-1.06-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.12-.24-.01-.39.11-.5c.11-.11.27-.29.37-.44c.13-.14.17-.25.25-.41c.08-.17.04-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.3-.01-.47-.01"
            />
          </svg>
        </button>

        <button type="button" className="btn" onClick={() => open(fb)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2.04c-5.5 0-10 4.49-10 10.02c0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89c1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

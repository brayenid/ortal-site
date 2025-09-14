'use client'

import { useBookmarks } from '@/hooks/useBookmarks'
import { useMemo } from 'react'

type Props = {
  slug: string
  className?: string
  size?: number
  labelSaved?: string
  labelSave?: string
}

export default function BookmarkButton({
  slug,
  className = '',
  size = 18,
  labelSaved = 'Tersimpan',
  labelSave = 'Simpan'
}: Props) {
  const { hydrated, has, toggle } = useBookmarks()
  const active = hydrated ? has(slug) : false

  const title = useMemo(() => (active ? 'Hapus dari bookmark' : 'Simpan ke bookmark'), [active])

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => toggle(slug)}
      title={title}
      className={`inline-flex items-center gap-2 btn ${active ? '' : 'btn-outline'} ${className}`}>
      {/* ikon simple tanpa lib */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        className={active ? '' : 'text-current'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="text-sm">{active ? labelSaved : labelSave}</span>
    </button>
  )
}

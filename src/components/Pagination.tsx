'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type Props = {
  total: number
  page: number
  perPage: number
  className?: string
  siblingCount?: number // jumlah halaman di kiri/kanan
  paramPageName?: string // default: 'page'
  paramPerName?: string // default: 'per'
}

function useHrefBuilder(paramPageName: string, paramPerName: string, perPage: number) {
  const pathname = usePathname()
  const sp = useSearchParams()
  return (targetPage: number) => {
    const params = new URLSearchParams(sp.toString())
    params.set(paramPageName, String(targetPage))
    params.set(paramPerName, String(perPage))
    return `${pathname}?${params.toString()}`
  }
}

function makeRange(totalPages: number, page: number, siblingCount: number) {
  const DOTS = '…'
  const first = 1
  const last = totalPages

  const left = Math.max(page - siblingCount, first)
  const right = Math.min(page + siblingCount, last)

  const range: (number | string)[] = []

  if (left > first + 1) {
    range.push(first, DOTS)
  } else {
    for (let i = first; i < left; i++) range.push(i)
  }

  for (let i = left; i <= right; i++) range.push(i)

  if (right < last - 1) {
    range.push(DOTS, last)
  } else {
    for (let i = right + 1; i <= last; i++) range.push(i)
  }

  return range
}

export default function Pagination({
  total,
  page,
  perPage,
  className = '',
  siblingCount = 1,
  paramPageName = 'page',
  paramPerName = 'per'
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  if (totalPages <= 1) return null

  const hrefFor = useHrefBuilder(paramPageName, paramPerName, perPage)
  const items = makeRange(totalPages, page, siblingCount)

  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)

  return (
    <nav className={`mt-8 flex items-center justify-center gap-2 ${className}`} aria-label="Pagination">
      <Link
        aria-label="Halaman sebelumnya"
        href={hrefFor(prevPage)}
        className={`btn-outline ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}>
        ←
      </Link>

      <div className="flex items-center gap-1">
        {items.map((it, idx) =>
          it === '…' ? (
            <span key={`dots-${idx}`} className="px-2 text-slate-500">
              …
            </span>
          ) : (
            <Link
              key={it as number}
              href={hrefFor(it as number)}
              aria-current={page === it ? 'page' : undefined}
              className={`px-4 py-2 rounded-xl text-sm ${
                page === it ? 'bg-gray-50 border text-gray-700' : 'text-slate-700 hover:bg-slate-100'
              }`}>
              {it}
            </Link>
          )
        )}
      </div>

      <Link
        aria-label="Halaman berikutnya"
        href={hrefFor(nextPage)}
        className={`btn-outline ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}>
        →
      </Link>
    </nav>
  )
}

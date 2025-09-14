'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

type Props = {
  paramName?: string
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export default function SearchBar({
  paramName = 'q',
  placeholder = 'Cari…',
  className = '',
  autoFocus = false
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const initial = sp.get(paramName) ?? ''
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => setValue(initial), [initial])
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const buildUrl = (q: string) => {
    const trimmed = q.trim()
    if (pathname === '/') {
      const p = new URLSearchParams()
      if (trimmed) p.set(paramName, trimmed)
      return `/artikel${p.toString() ? `?${p.toString()}` : ''}`
    }
    const params = new URLSearchParams(sp.toString())
    if (trimmed) params.set(paramName, trimmed)
    else params.delete(paramName)
    params.delete('page')
    return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    router.push(buildUrl(value))
  }

  return (
    <form onSubmit={onSubmit} className={`flex w-full items-stretch gap-0 ${className}`}>
      <input
        ref={inputRef}
        type="search"
        name={paramName}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 rounded-s-xl rounded-e-none border border-slate-300 bg-white/95 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <button type="submit" className="shrink-0 btn !rounded-s-none rounded-e-xl">
        Cari
      </button>
    </form>
  )
}

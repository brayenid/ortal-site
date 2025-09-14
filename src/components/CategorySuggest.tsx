'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Category = { id: string; name: string; slug: string }

const slugify = (raw: string): string =>
  raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

const humanize = (s: string): string =>
  s
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type Props = {
  value: string // slug yang sedang diketik/dipilih
  onChange: (slug: string) => void
  name?: string // default: "categorySlug"
  placeholder?: string
  debounceMs?: number // default: 300
  className?: string
}

export const CategorySuggest = ({
  value,
  onChange,
  name = 'categorySlug',
  placeholder = 'mis. gambar / pengumuman-penting',
  debounceMs = 600,
  className = ''
}: Props) => {
  const [items, setItems] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const debouncedQ = useDebounced(value.trim(), debounceMs)

  // fetch suggestions (debounced, cancellable)
  useEffect(() => {
    let aborted = false
    const ac = new AbortController()

    const run = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        if (debouncedQ) qs.set('q', debouncedQ)
        qs.set('take', '12')
        const res = await fetch(`/api/admin/category?${qs.toString()}`, {
          cache: 'no-store',
          signal: ac.signal
        })
        if (!res.ok) throw new Error('Gagal memuat kategori')
        const data = (await res.json()) as Category[]
        if (!aborted) setItems(data)
      } catch {
        if (!aborted) setItems([])
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    // tetap panggil meskipun q kosong → tampilkan daftar awal
    run()

    return () => {
      aborted = true
      ac.abort()
    }
  }, [debouncedQ, debounceMs])

  // tutup saat klik di luar
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // daftar final (sudah disaring di server; tetap limit lokal sebagai guard)
  const filtered = useMemo(() => items.slice(0, 12), [items])
  const existsExact = useMemo(
    () => filtered.some((c) => c.slug.toLowerCase() === value.trim().toLowerCase()),
    [filtered, value]
  )

  const select = (slug: string) => {
    onChange(slug)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open) return

    const optionsCount = filtered.length + (!existsExact && value.trim() ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(0, optionsCount - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active < filtered.length) {
        select(filtered[active].slug)
      } else if (!existsExact && value.trim()) {
        select(slugify(value))
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* input akan mengirim name=categorySlug ke server */}
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border-slate-300"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="category-suggest-listbox"
        role="combobox"
      />

      {open && (
        <div
          id="category-suggest-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Loading */}
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Memuat…</div>}

          {/* Suggestions */}
          {!loading &&
            filtered.map((c, idx) => (
              <button
                type="button"
                key={c.id}
                role="option"
                aria-selected={active === idx}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  active === idx ? 'bg-slate-50' : ''
                }`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => select(c.slug)}>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">/{c.slug}</div>
              </button>
            ))}

          {/* Create new option */}
          {!loading && !existsExact && value.trim() && (
            <button
              type="button"
              role="option"
              aria-selected={active === filtered.length}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-t ${
                active === filtered.length ? 'bg-emerald-50' : ''
              }`}
              onMouseEnter={() => setActive(filtered.length)}
              onClick={() => select(slugify(value))}>
              <div className="font-medium text-emerald-700">Buat kategori baru: “{humanize(value)}”</div>
              <div className="text-xs text-emerald-700/80">/{slugify(value)}</div>
            </button>
          )}

          {/* Kosong */}
          {!loading && filtered.length === 0 && !value.trim() && (
            <div className="px-3 py-2 text-sm text-slate-500">Tidak ada data</div>
          )}
        </div>
      )}
    </div>
  )
}

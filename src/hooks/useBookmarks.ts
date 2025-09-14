'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'bookmarks:v1'
type Id = string // pakai slug (atau id kalau mau, tinggal ganti)

const read = (): Id[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Id[]) : []
  } catch {
    return []
  }
}

const write = (list: Id[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('bookmarks:changed'))
  } catch {}
}

export function useBookmarks() {
  const [hydrated, setHydrated] = useState(false)
  const [list, setList] = useState<Id[]>([])

  // load awal + sync antar tab/komponen
  useEffect(() => {
    setList(read())
    setHydrated(true)

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setList(read())
    }
    const onCustom = () => setList(read())

    window.addEventListener('storage', onStorage)
    window.addEventListener('bookmarks:changed', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('bookmarks:changed', onCustom as EventListener)
    }
  }, [])

  const has = useCallback((id: Id) => list.includes(id), [list])

  const add = useCallback((id: Id) => {
    setList((prev) => {
      if (prev.includes(id)) return prev
      const next = [...new Set([...prev, id])]
      write(next)
      return next
    })
  }, [])

  const remove = useCallback((id: Id) => {
    setList((prev) => {
      const next = prev.filter((x) => x !== id)
      write(next)
      return next
    })
  }, [])

  const toggle = useCallback((id: Id) => {
    setList((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setList([])
    write([])
  }, [])

  return useMemo(
    () => ({ hydrated, list, has, add, remove, toggle, clear }),
    [hydrated, list, has, add, remove, toggle, clear]
  )
}

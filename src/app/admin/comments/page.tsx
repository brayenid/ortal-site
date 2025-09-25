'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Item = {
  id: string
  message: string
  createdAt: string
  isApproved: boolean
  isSpam: boolean
  isDeleted: boolean
  author?: { name?: string; username?: string; profileUrl?: string; avatar?: { permalink?: string; cache?: string } }
  thread?: { id?: string; title?: string; link?: string; forum?: string }
}

type Resp = { ok: true; items: Item[]; cursor?: string; hasNext?: boolean } | { error: string }

const fmtTime = (s: string) => {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s || '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim()

const LIMIT_OPTIONS = [10, 20, 50, 100] as const
type Limit = (typeof LIMIT_OPTIONS)[number]

export default function AdminCommentsPage() {
  const router = useRouter()
  const sp = useSearchParams()

  // Ambil limit dari URL (opsional), default 20
  const limitFromUrl = Number(sp.get('limit') || 20)
  const initialLimit = (LIMIT_OPTIONS as readonly number[]).includes(limitFromUrl) ? (limitFromUrl as Limit) : 20

  const [items, setItems] = useState<Item[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasNext, setHasNext] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [err, setErr] = useState<string | null>(null)
  const [limit, setLimit] = useState<Limit>(initialLimit)

  const load = async (opts?: { cursor?: string; fresh?: boolean }) => {
    const { cursor: nextCursor, fresh } = opts || {}
    setLoading(true)
    setErr(null)
    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (nextCursor) params.set('cursor', nextCursor)
      const url = '/api/admin/comments?' + params.toString()

      const res = await fetch(url, { cache: 'no-store' })
      const data: Resp = await res.json()
      if (!('ok' in data)) throw new Error(data.error || 'Gagal memuat komentar')

      setItems((prev) => (fresh || !nextCursor ? data.items : [...prev, ...data.items]))
      setCursor(data.cursor)
      setHasNext(Boolean(data.hasNext))
    } catch (e: any) {
      setErr(e?.message || 'Gagal memuat komentar')
    } finally {
      setLoading(false)
    }
  }

  // Initial load (menghormati limit dari URL)
  useEffect(() => {
    void load({ fresh: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]) // reload saat limit berubah

  // Sinkronkan limit ke URL agar bisa di-bookmark
  useEffect(() => {
    const params = new URLSearchParams(Array.from(sp.entries()))
    params.set('limit', String(limit))
    router.replace(`/admin/comments?${params.toString()}`)
  }, [limit, router, sp])

  const headerInfo = useMemo(() => `Menampilkan ${items.length}${loading ? '…' : ''} komentar`, [items.length, loading])

  return (
    <div className="container py-10">
      <div className="flex justify-end mb-4">
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Komentar Disqus (Terbaru)</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="limit" className="text-sm text-slate-600">
            Limit
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) as Limit)}
            className="rounded-xl border border-slate-300 bg-white pr-8 py-1.5 text-sm"
            aria-label="Batas komentar per permintaan">
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left">Komentar</th>
                <th className="px-3 py-2 text-left w-[28%]">Thread</th>
                <th className="px-3 py-2 text-left w-[22%]">Penulis</th>
                <th className="px-3 py-2 text-left w-[14%]">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Memuat…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Belum ada komentar.
                  </td>
                </tr>
              ) : (
                items.map((c) => {
                  const msg = stripHtml(c.message).slice(0, 220)
                  const name = c.author?.name || c.author?.username || 'Anonim'
                  const avatar =
                    c.author?.avatar?.cache || c.author?.avatar?.permalink || 'https://www.gravatar.com/avatar?d=mp'
                  const threadTitle = c.thread?.title || '(tanpa judul)'
                  const threadLink = c.thread?.link
                  const flags = c.isDeleted
                    ? 'text-red-600'
                    : c.isSpam
                    ? 'text-amber-600'
                    : !c.isApproved
                    ? 'text-slate-500'
                    : 'text-emerald-600'

                  return (
                    <tr key={c.id} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-2">
                        <div className="text-slate-800 text-xs sm:text-sm">
                          {msg}
                          {msg.length >= 220 ? '…' : ''}
                        </div>
                        <div className={`mt-1 text-[11px] ${flags}`}>
                          {c.isDeleted
                            ? 'Dihapus'
                            : c.isSpam
                            ? 'Ditandai spam'
                            : c.isApproved
                            ? 'Disetujui'
                            : 'Menunggu moderasi'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {threadLink ? (
                          <a
                            href={threadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary hover:underline text-xs sm:text-sm">
                            {threadTitle}
                          </a>
                        ) : (
                          <span className="text-slate-700">{threadTitle}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {c.author?.profileUrl ? (
                            <a
                              href={c.author.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-xs sm:text-sm">
                              {name}
                            </a>
                          ) : (
                            <span>{name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm">{fmtTime(c.createdAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* footer kontrol */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">{headerInfo}</div>
          <div className="flex items-center gap-2">
            <button className="btn" disabled={loading} onClick={() => void load({ fresh: true })}>
              Segarkan
            </button>
            {hasNext && (
              <button className="btn" disabled={loading} onClick={() => void load({ cursor })}>
                Muat lagi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

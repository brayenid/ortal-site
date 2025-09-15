'use client'

import React, { memo } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  Filter,
  ListFilter,
  RefreshCcw,
  Search,
  Trash2,
  X,
  Pencil
} from 'lucide-react'

/* ====== Types yang sama dengan di page ====== */
type CategoryLite = { name?: string | null; slug?: string | null } | null
export type ArticleItem = {
  id: string
  title: string
  slug: string
  published: boolean
  coverImageUrl?: string | null
  content?: string | null
  category?: CategoryLite
  createdAt?: string | Date
}

export type DrawerCategoryOption = { slug: string; name: string }

/* ====== Props ====== */
type Props = {
  drawerOpen: boolean
  setDrawerOpen: (v: boolean) => void
  drawerRef: React.RefObject<HTMLDivElement>

  q: string
  setQ: (v: string) => void

  filterCat: string
  setFilterCat: (v: string) => void

  filterPub: 'all' | 'published' | 'draft'
  setFilterPub: (v: 'all' | 'published' | 'draft') => void

  sortBy: 'newest' | 'title_asc' | 'title_desc'
  setSortBy: (v: 'newest' | 'title_asc' | 'title_desc') => void

  limit: number
  setLimit: (v: number) => void

  loading: boolean
  filtered: ArticleItem[]
  visibleItems: ArticleItem[]
  canLoadMore: boolean
  STEP: number
  visibleCount: number
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>

  categoryOptions: DrawerCategoryOption[]

  // handlers yang dipakai di list item
  fillForm: (a: ArticleItem) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onToggle: (id: string, next: boolean) => void | Promise<void>
  setNotice: (n: { type: 'success' | 'error'; text: string } | null) => void
}

/* ====== Komponen (stabil & memoized) ====== */
export const ArticleDrawer: React.FC<Props> = memo((props): JSX.Element => {
  const {
    drawerOpen,
    setDrawerOpen,
    drawerRef,

    q,
    setQ,

    filterCat,
    setFilterCat,

    filterPub,
    setFilterPub,

    sortBy,
    setSortBy,

    limit,
    setLimit,

    loading,
    filtered,
    visibleItems,
    canLoadMore,
    STEP,
    visibleCount,
    setVisibleCount,

    categoryOptions,

    fillForm,
    onDelete,
    onToggle,
    setNotice
  } = props

  return (
    <>
      {/* Backdrop (div supaya tidak nyolong fokus) */}
      <div
        aria-hidden={!drawerOpen}
        hidden={!drawerOpen}
        onMouseDown={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-[120] bg-black/40 transition-opacity will-change-[opacity] ${
          drawerOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 w-full sm:w-[88vw] max-w-md bg-white shadow-2xl z-[200]
          transform transition-transform will-change-transform ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 p-3 bg-white">
          <div className="font-semibold">Daftar Artikel</div>
          <button
            type="button"
            aria-label="Tutup"
            className="rounded-lg p-2 hover:bg-slate-100"
            onClick={() => setDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari judul/slug/kategori…"
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 w-full text-xs"
              />
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setQ('')
                setFilterCat('')
                setFilterPub('all')
                setSortBy('newest')
                setLimit(20)
              }}>
              <RefreshCcw size={16} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-1.5 px-2 text-xs">
                <option value="">Kategori</option>
                {categoryOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterPub}
                onChange={(e) => setFilterPub(e.target.value as 'all' | 'published' | 'draft')}
                className="w-full rounded-xl border border-slate-300 py-1.5 px-2 text-xs">
                <option value="all">Semua status</option>
                <option value="published">Terbit</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'title_asc' | 'title_desc')}
                className="w-full rounded-xl border border-slate-300 py-1.5 px-2 text-xs">
                <option value="newest">Terbaru</option>
                <option value="title_asc">Judul A→Z</option>
                <option value="title_desc">Judul Z→A</option>
              </select>
            </div>
          </div>

          {/* Limit */}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <ListFilter size={16} className="text-slate-400" />
            <span className="text-slate-600">Tampilkan</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={80}>80</option>
              <option value={-1}>Semua</option>
            </select>
            <span className="ml-auto text-slate-500">{filtered.length} data</span>
          </div>
        </div>

        {/* List */}
        <div className="h-[calc(100vh-170px)] overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-slate-500 p-2">Memuat…</div>
          ) : visibleItems.length ? (
            visibleItems.map((a) => {
              const dateStr: string = a.createdAt
                ? new Date(a.createdAt as any).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                : ''
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                            a.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                          {a.published ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          {a.published ? 'Terbit' : 'Draft'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{a.category?.name ?? 'Umum'}</span>
                        {dateStr ? (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{dateStr}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="font-medium mt-0.5 line-clamp-2">{a.title}</div>
                      <div className="text-xs text-slate-500 break-all">/{a.slug}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/artikel/${a.slug}`}
                          target="_blank"
                          className="btn !px-2 !py-1 text-xs flex items-center">
                          <Eye size={14} />
                          <span className="ml-1">Lihat</span>
                        </Link>

                        <button className="btn !px-2 !py-1 text-xs flex items-center" onClick={() => void fillForm(a)}>
                          <Pencil size={14} />
                          <span className="ml-1">Edit</span>
                        </button>

                        <button
                          className="btn !px-2 !py-1 text-xs !bg-red-600 hover:!bg-red-700 flex items-center"
                          onClick={() => void onDelete(a.id)}>
                          <Trash2 size={14} />
                          <span className="ml-1">Hapus</span>
                        </button>

                        <button
                          className="btn !px-2 !py-1 text-xs flex items-center"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${location.origin}/artikel/${a.slug}`)
                              setNotice({ type: 'success', text: 'Tautan disalin.' })
                            } catch {
                              setNotice({ type: 'error', text: 'Gagal menyalin tautan.' })
                            }
                          }}>
                          <Copy size={14} />
                          <span className="ml-1">Salin</span>
                        </button>

                        <label className="ml-auto inline-flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={a.published}
                            onChange={(ev) => void onToggle(a.id, ev.target.checked)}
                          />
                          <span>{a.published ? 'Public' : 'Draft'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-slate-500 p-2 text-xs">Tidak ada data yang cocok.</div>
          )}

          {/* Load more */}
          {canLoadMore && limit !== -1 && (
            <div className="pt-2 flex justify-center flex-col items-center gap-2">
              <button
                type="button"
                className="p-2 border rounded text-gray-600 hover:bg-gray-100 bg-gray-50 transition-all text-center text-xs"
                onClick={() => setVisibleCount((c) => c + STEP)}>
                Muat {Math.min(STEP, filtered.length - visibleCount)} lagi
              </button>
              <div className="mt-1 text-center text-xs text-slate-500">
                Menampilkan {visibleItems.length} dari {filtered.length}
              </div>
            </div>
          )}
          {!canLoadMore && filtered.length > 0 && (
            <div className="text-center text-xs text-slate-500 pt-1">
              Menampilkan {visibleItems.length} dari {filtered.length}
            </div>
          )}
        </div>
      </div>
    </>
  )
})

ArticleDrawer.displayName = 'ArticleDrawer'

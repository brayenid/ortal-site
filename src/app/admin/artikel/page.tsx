'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SimpleWysiwyg } from '@/components/Wysiwyg'
import { CategorySuggest } from '@/components/CategorySuggest'
import { Menu } from 'lucide-react'
import { ArticleDrawer } from '@/components/Drawer'

type CategoryLite = { name?: string | null; slug?: string | null } | null
type ArticleItem = {
  id: string
  title: string
  slug: string
  published: boolean
  coverImageUrl?: string | null
  content?: string | null
  category?: CategoryLite
  createdAt?: string | Date
}
type ApiArticleResponse = ArticleItem & { _meta?: { message?: string; slugAdjusted?: boolean } }
type Notice = { type: 'success' | 'error'; text: string } | null

/* ---------- UI helpers ---------- */
const NoticeToast = ({ notice, onClose }: { notice: Notice; onClose: () => void }) => {
  if (!notice) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-[100] rounded-2xl shadow-lg px-4 py-3 text-sm ${
        notice.type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}>
      <div className="flex items-start gap-3">
        <span className="font-medium">{notice.type === 'success' ? 'Berhasil' : 'Gagal'}</span>
        <span>·</span>
        <span>{notice.text}</span>
        <button className="ml-3 text-xs underline" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}

/* ---------- helpers & API ---------- */
const slugify = (raw: string): string =>
  raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

const stripHtml = (html?: string | null, max = 140) => {
  if (!html) return ''
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

const getArticles = async (): Promise<ArticleItem[]> => {
  const res = await fetch(`/api/admin/article`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Gagal memuat artikel')
  return (await res.json()) as ArticleItem[]
}
const getArticleDetail = async (id: string): Promise<ArticleItem> => {
  const res = await fetch(`/api/admin/article?id=${id}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal mengambil artikel')
  return data as ArticleItem
}
const createArticle = async (form: HTMLFormElement): Promise<ApiArticleResponse> => {
  const fd = new FormData(form)
  const res = await fetch(`/api/admin/article`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan artikel')
  return data as ApiArticleResponse
}
const updateArticle = async (form: HTMLFormElement): Promise<ApiArticleResponse> => {
  const fd = new FormData(form)
  const res = await fetch(`/api/admin/article`, { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan perubahan')
  return data as ApiArticleResponse
}
const updatePublished = async (id: string, published: boolean): Promise<ApiArticleResponse> => {
  const res = await fetch(`/api/admin/article`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, published })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal mengubah status terbit')
  return data as ApiArticleResponse
}
const deleteArticle = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const res = await fetch(`/api/admin/article`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menghapus artikel')
  return data as any
}

/* ---------- Page ---------- */
export default function Page(): JSX.Element {
  const [items, setItems] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState<string>('')
  const [slug, setSlug] = useState<string>('')
  const [slugTouched, setSlugTouched] = useState<boolean>(false)
  const [categorySlug, setCategorySlug] = useState<string>('')
  const [content, setContent] = useState<string>('') // HTML dari WYSIWYG
  const [published, setPublished] = useState<boolean>(false)
  const [folder, setFolder] = useState<string>('office-site/articles')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement | null>(null)

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement | null>(null)

  // list search, filter, sort
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [filterCat, setFilterCat] = useState<string>('') // slug
  const [filterPub, setFilterPub] = useState<'all' | 'published' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'title_asc' | 'title_desc'>('newest')

  // limit & load more
  const [limit, setLimit] = useState<number>(20) // -1 = Semua
  const [visibleCount, setVisibleCount] = useState<number>(20)
  const STEP = 20

  // debounce
  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q.trim().toLowerCase()), 250)
    return () => clearTimeout(id)
  }, [q])

  // load data
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getArticles())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat artikel' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // auto slug
  useEffect(() => {
    if (slugTouched || editingId) return
    const id = setTimeout(() => setSlug(slugify(title)), 150)
    return () => clearTimeout(id)
  }, [title, slugTouched, editingId])

  // preview cover
  useEffect(() => {
    if (!file) return setFilePreview(null)
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // drawer effects: lock scroll + Esc close + focus
  useEffect(() => {
    const body = document.body
    if (drawerOpen) body.style.overflow = 'hidden'
    else body.style.overflow = ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    if (drawerOpen) {
      setTimeout(() => drawerRef.current?.querySelector<HTMLInputElement>('input,select,button,a')?.focus(), 10)
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const onSelectFile = (f: File | null) => setFile(f)
  const onDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const f = e.dataTransfer.files?.[0] ?? null
    if (f) onSelectFile(f)
  }

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setSlug('')
    setSlugTouched(false)
    setCategorySlug('')
    setContent('')
    setPublished(false)
    setFolder('office-site/articles')
    setFile(null)
    setFilePreview(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  const fillForm = async (a: ArticleItem) => {
    setEditingId(a.id)
    setTitle(a.title)
    setSlug(a.slug)
    setSlugTouched(true)
    setCategorySlug(a.category?.slug ?? '')
    setPublished(a.published)
    setFile(null)
    setFilePreview(null)

    if (typeof a.content === 'string') {
      setContent(a.content ?? '')
    } else {
      try {
        const full = await getArticleDetail(a.id)
        setContent(full.content ?? '')
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal mengambil detail artikel' })
        setContent('')
      }
    }
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const form = e.currentTarget

    // hidden fields
    const hiddenContent = form.querySelector<HTMLInputElement>('input[name="content"]')
    if (hiddenContent) hiddenContent.value = content
    const hiddenFolder = form.querySelector<HTMLInputElement>('input[name="folder"]')
    if (hiddenFolder) hiddenFolder.value = folder

    setSubmitting(true)
    try {
      const resp = editingId ? await updateArticle(form) : await createArticle(form)
      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Artikel berhasil disimpan.')
      })

      if (editingId) {
        setItems((prev) => prev.map((it) => (it.id === resp.id ? resp : it)))
      } else {
        setItems((prev) => [resp, ...prev])
      }
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onToggle = async (id: string, next: boolean) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, published: next } : it)))
    try {
      const updated = await updatePublished(id, next)
      setNotice({ type: 'success', text: updated?._meta?.message || 'Status terbit diperbarui.' })
    } catch (err) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, published: !next } : it)))
      setNotice({ type: 'error', text: (err as Error).message })
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Yakin hapus artikel ini? Media terkait akan dihapus dari Cloudinary.')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const res = await deleteArticle(id)
      setNotice({ type: 'success', text: res?._meta?.message || 'Artikel dihapus.' })
      if (editingId === id) resetForm()
    } catch (err) {
      setItems(prev)
      setNotice({ type: 'error', text: (err as Error).message })
    }
  }

  // opsi kategori unik dari data
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((a) => {
      const s = a.category?.slug?.trim()
      const n = a.category?.name?.trim()
      if (s && n) map.set(s, n)
    })
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }))
  }, [items])

  // Filtered & sorted
  const filtered = useMemo(() => {
    let arr = items.slice()

    if (qDebounced) {
      arr = arr.filter((a) => {
        const hay = `${a.title} ${a.slug} ${a.category?.name ?? ''} ${stripHtml(a.content, 9999)}`.toLowerCase()
        return hay.includes(qDebounced)
      })
    }
    if (filterCat) {
      arr = arr.filter((a) => a.category?.slug === filterCat)
    }
    if (filterPub !== 'all') {
      arr = arr.filter((a) => (filterPub === 'published' ? a.published : !a.published))
    }

    if (sortBy === 'title_asc' || sortBy === 'title_desc') {
      arr.sort((a, b) => (sortBy === 'title_asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)))
    } else {
      arr.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt as any).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt as any).getTime() : 0
        return db - da
      })
    }
    return arr
  }, [items, qDebounced, filterCat, filterPub, sortBy])

  // reset visibleCount saat filter/limit berubah
  useEffect(() => {
    setVisibleCount(limit === -1 ? Number.MAX_SAFE_INTEGER : Math.max(1, limit))
  }, [qDebounced, filterCat, filterPub, sortBy, limit])

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const canLoadMore = filtered.length > visibleCount

  return (
    <div className="container py-10">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl p-2 border border-slate-300 hover:bg-slate-50"
            aria-label="Buka daftar artikel"
            onClick={() => setDrawerOpen(true)}>
            <Menu size={18} />
          </button>
          <h1 className="text-2xl font-bold">Kelola Artikel</h1>
          <span className="text-sm text-slate-500 hidden sm:inline">({items.length} total)</span>
        </div>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* Drawer */}
      <ArticleDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        drawerRef={drawerRef}
        q={q}
        setQ={setQ}
        filterCat={filterCat}
        setFilterCat={setFilterCat}
        filterPub={filterPub}
        setFilterPub={setFilterPub}
        sortBy={sortBy}
        setSortBy={setSortBy}
        limit={limit}
        setLimit={setLimit}
        loading={loading}
        filtered={filtered}
        visibleItems={visibleItems}
        canLoadMore={canLoadMore}
        STEP={STEP}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
        categoryOptions={categoryOptions}
        fillForm={fillForm}
        onDelete={onDelete}
        onToggle={onToggle}
        setNotice={setNotice}
      />

      {/* ===== FORM (full width) ===== */}
      <form onSubmit={onSubmit} className="card space-y-5" encType="multipart/form-data">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit artikel.</div>
            <button type="button" className="underline" onClick={resetForm}>
              Batal
            </button>
          </div>
        ) : null}

        {editingId && <input type="hidden" name="id" value={editingId} />}
        <input type="hidden" name="content" value={content} />
        <input type="hidden" name="folder" value={folder} />

        {/* grid 2 kolom */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Judul</label>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border-slate-300"
              placeholder="Judul artikel…"
            />
            <div className="mt-1 text-xs text-slate-500">Slug akan dibuat otomatis dari judul (bisa edit).</div>
          </div>

          <div>
            <label className="block text-sm mb-1">Slug</label>
            <div className="flex items-center gap-2">
              <input
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                className="w-full rounded-xl border-slate-300"
                placeholder="judul-artikel-kamu"
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSlugTouched(true)
                  setSlug(slugify(title))
                }}>
                Generate
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500">Kalau bentrok, server otomatis bikin slug unik.</div>
          </div>

          <div>
            <label className="block text-sm mb-1">Kategori</label>
            <CategorySuggest value={categorySlug} onChange={setCategorySlug} />
            <div className="mt-1 text-xs text-slate-500">
              Pilih dari kategori yang ada atau ketik baru untuk membuat otomatis saat menyimpan.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="published"
              name="published"
              type="checkbox"
              className="rounded"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <label htmlFor="published">Terbitkan</label>
          </div>

          {/* COVER (span 2 kolom) */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Cover (gambar/video)</label>
            <input
              ref={inputFileRef}
              type="file"
              name="cover"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept="image/*,video/*"
            />
            <label
              onClick={() => inputFileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => onDrop(e)}
              className="w-full border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:border-primary transition block">
              {filePreview ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-full max-w-2xl aspect-video overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={filePreview} alt="Preview" className="object-cover w-full h-full" />
                  </div>
                  <div className="text-sm text-slate-600">{file?.name}</div>
                  <div className="text-xs text-slate-500">Klik untuk ganti file</div>
                </div>
              ) : (
                <div className="text-slate-600">
                  <div className="font-medium">Tarik & letakkan file di sini</div>
                  <div className="text-sm">atau klik untuk memilih (gambar/video)</div>
                </div>
              )}
            </label>
            {editingId && (
              <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti cover.</div>
            )}
          </div>

          {/* WYSIWYG (span 2 kolom) */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Konten</label>
            <SimpleWysiwyg
              value={content}
              onChange={setContent}
              placeholder="Tulis konten artikel di sini…"
              stickyOffset={72}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" className="btn !bg-slate-100 !text-slate-700" onClick={resetForm}>
            Reset
          </button>
          <button className="btn" disabled={submitting}>
            {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}

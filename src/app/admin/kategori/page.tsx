'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Category = { id: string; name: string; slug: string; _count?: { articles: number } }
type ApiResp = Category & { _meta?: { message?: string } }
type Notice = { type: 'success' | 'error'; text: string } | null

/* ---- UI: Toast ---- */
const NoticeToast = ({ notice, onClose }: { notice: Notice; onClose: () => void }) =>
  !notice ? null : (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-[60] rounded-2xl shadow-lg px-4 py-3 text-sm ${
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

/* ---- helpers ---- */
const slugify = (raw: string): string =>
  (raw ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

/* ---- API wrappers ---- */
const getCategories = async (): Promise<Category[]> => {
  const res = await fetch('/api/admin/category', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat kategori')
  return data as Category[]
}

const createCategory = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/category', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan kategori')
  return data as ApiResp
}

const updateCategory = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/category', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan perubahan')
  return data as ApiResp
}

const deleteCategory = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const res = await fetch('/api/admin/category', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menghapus kategori')
  return data as any
}

/* ---- Page ---- */
export default function CategoryAdminPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getCategories())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat kategori' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // auto-slug dari name (kecuali user sudah editing slug)
  useEffect(() => {
    if (slugTouched || editingId) return
    const id = setTimeout(() => setSlug(slugify(name)), 120)
    return () => clearTimeout(id)
  }, [name, slugTouched, editingId])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setSlug('')
    setSlugTouched(false)
  }

  const fillForm = (c: Category) => {
    setEditingId(c.id)
    setName(c.name)
    setSlug(c.slug)
    setSlugTouched(true)
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const resp = editingId ? await updateCategory(fd) : await createCategory(fd)
      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Kategori disimpan.')
      })
      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
      } else {
        setItems((prev) => [...prev, resp].sort((a, b) => a.name.localeCompare(b.name)))
      }
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    const cat = items.find((x) => x.id === id)
    if (!cat) return
    const used = cat._count?.articles ?? 0
    if (!confirm(used > 0 ? `Kategori dipakai di ${used} artikel. Tetap hapus?` : 'Yakin hapus kategori ini?')) return

    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const res = await deleteCategory(id)
      setNotice({ type: 'success', text: res?._meta?.message || 'Kategori dihapus.' })
      if (editingId === id) resetForm()
    } catch (err) {
      setItems(prev)
      setNotice({ type: 'error', text: (err as Error).message })
    }
  }

  const list = useMemo(() => {
    if (loading) return <div className="text-slate-500">Memuat…</div>
    if (!items.length) return <div className="text-slate-500">Belum ada data.</div>
    return (
      <div className="grid md:grid-cols-3 gap-3">
        {items.map((c) => (
          <div key={c.id} className="card flex flex-col gap-2">
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs text-slate-500 break-all">/{c.slug}</div>
            <div className="text-xs text-slate-500">{c._count?.articles ?? 0} artikel</div>
            <div className="mt-2 flex items-center gap-2">
              <button className="btn" onClick={() => fillForm(c)}>
                Edit
              </button>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(c.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }, [items, loading])

  return (
    <div className="container py-10">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Kategori</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM CREATE / EDIT */}
      <form onSubmit={onSubmit} className="card space-y-4">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit kategori.</div>
            <button type="button" className="underline" onClick={resetForm}>
              Batal
            </button>
          </div>
        ) : null}

        {editingId && <input type="hidden" name="id" value={editingId} />}

        <div>
          <label className="block text-sm mb-1">Nama</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Nama kategori…"
          />
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
              placeholder="nama-kategori"
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSlugTouched(true)
                setSlug(slugify(name))
              }}>
              Generate
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500">Jika slug bentrok, server akan membuat yang unik otomatis.</div>
        </div>

        <button className="btn" disabled={submitting}>
          {submitting ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </form>

      <div className="mt-8">{list}</div>
    </div>
  )
}

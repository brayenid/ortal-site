'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import NoticeToast, { Notice } from '@/components/Toast'

type Banner = {
  id: string
  title: string
  description?: string | null
  linkUrl?: string | null
  imageUrl: string
  width: number
  height: number
  order: number
  published: boolean
  createdAt: string
  updatedAt: string
}

const TARGET_RATIO = 4 / 1
const TOLERANCE = 0.08
const MIN_WIDTH = 1200

const getBanners = async (): Promise<Banner[]> => {
  const res = await fetch('/api/admin/banner', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat banner')
  return data as Banner[]
}
const createBanner = async (fd: FormData) => {
  const res = await fetch('/api/admin/banner', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan banner')
  return data as Banner & { _meta?: { message?: string } }
}
const updateBanner = async (fd: FormData) => {
  const res = await fetch('/api/admin/banner', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan perubahan')
  return data as Banner & { _meta?: { message?: string } }
}
const patchBanner = async (payload: Partial<Pick<Banner, 'id' | 'published' | 'order'>> & { id: string }) => {
  const res = await fetch('/api/admin/banner', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memperbarui banner')
  return data as Banner & { _meta?: { message?: string } }
}
const deleteBanner = async (id: string) => {
  const res = await fetch('/api/admin/banner', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menghapus banner')
  return data as { ok: true; _meta?: { message?: string } }
}

export default function BannerAdminPage() {
  const [items, setItems] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [published, setPublished] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getBanners())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat banner' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const validateClientImage = (imgFile: File): Promise<void> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth,
          h = img.naturalHeight
        if (w < MIN_WIDTH) return reject(new Error(`Lebar minimum ${MIN_WIDTH}px (gambar: ${w}px)`))
        const r = w / h,
          low = TARGET_RATIO * (1 - TOLERANCE),
          high = TARGET_RATIO * (1 + TOLERANCE)
        if (r < low || r > high) return reject(new Error(`Rasio harus ~3:1 (±8%). Rasio gambar: ${r.toFixed(2)}`))
        resolve()
      }
      img.onerror = () => reject(new Error('Gagal membaca gambar'))
      img.src = URL.createObjectURL(imgFile)
    })

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setLinkUrl('')
    setPublished(true)
    setFile(null)
    setFilePreview(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  const fillForm = (b: Banner) => {
    setEditingId(b.id)
    setTitle(b.title)
    setDescription(b.description ?? '')
    setLinkUrl(b.linkUrl ?? '')
    setPublished(b.published)
    setFile(null)
    setFilePreview(null)
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    try {
      setSubmitting(true)

      if (!editingId) {
        const f = fd.get('image') as File | null
        if (!f || f.size === 0) throw new Error('Gambar wajib diunggah')
        await validateClientImage(f)
        const created = await createBanner(fd)
        setItems((prev) =>
          [created, ...prev].sort((a, b) => a.order - b.order || +new Date(b.createdAt) - +new Date(a.createdAt))
        )
        setNotice({ type: 'success', text: created._meta?.message || 'Banner ditambahkan.' })
        resetForm()
      } else {
        fd.set('id', editingId)
        // kalau tidak pilih file baru, pastikan input kosong (biar server tidak mengira ada file)
        const f = fd.get('image') as File | null
        if (f && f.size > 0) await validateClientImage(f)
        const updated = await updateBanner(fd)
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        setNotice({ type: 'success', text: updated._meta?.message || 'Perubahan disimpan.' })
        resetForm()
      }
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onToggle = async (id: string, next: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, published: next } : x)))
    try {
      const updated = await patchBanner({ id, published: next })
      setNotice({ type: 'success', text: updated._meta?.message || 'Status diubah.' })
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, published: !next } : x)))
      setNotice({ type: 'error', text: (e as Error).message })
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Yakin hapus banner ini? Gambar Cloudinary juga akan dihapus.')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const res = await deleteBanner(id)
      setNotice({ type: 'success', text: res._meta?.message || 'Banner dihapus.' })
      if (editingId === id) resetForm()
    } catch (e) {
      setItems(prev)
      setNotice({ type: 'error', text: (e as Error).message })
    }
  }

  const list = useMemo(() => {
    if (loading) return <div className="text-slate-500">Memuat…</div>
    if (!items.length) return <div className="text-slate-500">Belum ada banner.</div>

    return (
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((b) => (
          <div key={b.id} className="card">
            <div className="relative aspect-[3/1] mb-3 overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{b.title}</div>
                {b.description && <div className="text-sm text-slate-600 line-clamp-2">{b.description}</div>}
                {b.linkUrl && (
                  <a href={b.linkUrl} target="_blank" className="text-sm text-blue-600 underline break-all">
                    {b.linkUrl}
                  </a>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {b.width}×{b.height} • order {b.order}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={b.published}
                  onChange={(e) => void onToggle(b.id, e.target.checked)}
                />
                <span>{b.published ? 'Public' : 'Draft'}</span>
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button className="btn" onClick={() => fillForm(b)}>
                Edit
              </button>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(b.id)}>
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Banner</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM */}
      <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit banner.</div>
            <button type="button" className="underline" onClick={resetForm}>
              Batal
            </button>
          </div>
        ) : null}

        {editingId && <input type="hidden" name="id" value={editingId} />}

        <div>
          <label className="block text-sm mb-1">Judul</label>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Judul banner…"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Deskripsi singkat</label>
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Deskripsi singkat…"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Link (opsional)</label>
          <input
            name="linkUrl"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="https://contoh.com/tujuan"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Gambar (rasio ~4:1, min lebar {MIN_WIDTH}px)</label>
          <input
            ref={inputFileRef}
            type="file"
            name="image"
            className="hidden"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label
            onClick={() => inputFileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const f = e.dataTransfer.files?.[0]
              if (f) setFile(f)
            }}
            className="w-full border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:border-primary transition block">
            {filePreview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-3xl aspect-[3/1] overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Preview" className="object-cover w-full h-full" />
                </div>
                <div className="text-sm text-slate-600">{file?.name}</div>
                <div className="text-xs text-slate-500">Klik untuk ganti file</div>
              </div>
            ) : (
              <div className="text-slate-600">
                <div className="font-medium">Tarik & letakkan gambar di sini</div>
                <div className="text-sm">atau klik untuk memilih</div>
              </div>
            )}
          </label>
          {editingId && <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti gambar.</div>}
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
          <label htmlFor="published">Tampilkan</label>
        </div>

        <button className="btn" disabled={submitting}>
          {submitting ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </form>

      <div className="mt-8">{list}</div>
    </div>
  )
}

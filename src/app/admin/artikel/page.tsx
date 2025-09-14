'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SimpleWysiwyg } from '@/components/Wysiwyg'
import { CategorySuggest } from '@/components/CategorySuggest'

type CategoryLite = { name?: string | null; slug?: string | null } | null
type ArticleItem = {
  id: string
  title: string
  slug: string
  published: boolean
  coverImageUrl?: string | null
  content?: string | null
  category?: CategoryLite
}
type ApiArticleResponse = ArticleItem & { _meta?: { message?: string; slugAdjusted?: boolean } }
type Notice = { type: 'success' | 'error'; text: string } | null

/* --- Notice toast --- */
const NoticeToast = ({ notice, onClose }: { notice: Notice; onClose: () => void }) => {
  if (!notice) return null
  return (
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
}

/* --- helpers & API (sama seperti punyamu) --- */
const slugify = (raw: string): string =>
  raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

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

/* --- Page --- */
const Page = (): JSX.Element => {
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

  const load = async () => {
    setLoading(true)
    try {
      setItems(await getArticles())
    } catch (e: any) {
      setNotice({ type: 'error', text: e?.message || 'Gagal memuat artikel' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // auto slug
  useEffect(() => {
    if (slugTouched || editingId) return
    const id = setTimeout(() => setSlug(slugify(title)), 150)
    return () => clearTimeout(id)
  }, [title, slugTouched, editingId])

  // preview
  useEffect(() => {
    if (!file) return setFilePreview(null)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setFilePreview(null)
  }, [file])

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
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const form = e.currentTarget

    // pastikan input hidden "content" ikut terisi (kalau user belum sentuh editor)
    const hidden = form.querySelector<HTMLInputElement>('input[name="content"]')
    if (hidden) hidden.value = content

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

  const list = useMemo(() => {
    if (loading) return <div className="text-slate-500">Memuat...</div>
    if (!items.length) return <div className="text-slate-500">Belum ada data.</div>
    return (
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">
                  {a.category?.name ?? 'Umum'} • {a.published ? 'Terbit' : 'Draft'}
                </div>
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-slate-500 break-all">/{a.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
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
            <div className="mt-3 flex items-center gap-2">
              <button className="btn" onClick={() => void fillForm(a)}>
                Edit
              </button>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(a.id)}>
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
        <h1 className="text-2xl font-bold">Kelola Artikel</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM CREATE / EDIT */}
      <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit artikel.</div>
            <button
              type="button"
              className="underline"
              onClick={() => {
                // reset juga editor
                resetForm()
              }}>
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

        <div>
          <label className="block text-sm mb-1">Cover (gambar/video)</label>
          <input
            ref={inputFileRef}
            type="file"
            name="cover"
            className="hidden"
            onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
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
                <div className="relative w-full max-w-md aspect-video overflow-hidden rounded-xl">
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
          {editingId && <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti cover.</div>}
        </div>

        {/* WYSIWYG + input hidden "content" */}
        <div>
          <label className="block text-sm mb-1">Konten</label>
          {/* input hidden yang dikirim ke server */}
          <input type="hidden" name="content" value={content} />
          {/* editor visual */}
          <SimpleWysiwyg value={content} onChange={setContent} placeholder="Tulis konten artikel di sini…" />
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

        <button className="btn" disabled={submitting}>
          {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </form>

      <div className="mt-8">{list}</div>
    </div>
  )
}

export default Page

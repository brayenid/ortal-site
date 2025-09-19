'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NoticeToast, { Notice } from '@/components/Toast'

type Video = {
  id: string
  title: string
  url: string
  thumbnailUrl?: string | null
  description?: string | null
  createdAt?: string
}

type ApiResp = Video & { _meta?: { message?: string } }

/* ---- util client: parse id for preview ---- */
const YT_ID = /^[A-Za-z0-9_-]{11}$/
function parseYouTubeIdClient(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null
  if (YT_ID.test(raw)) return raw
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] ?? ''
      return YT_ID.test(id) ? id : null
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v') ?? ''
        return YT_ID.test(id) ? id : null
      }
      const parts = u.pathname.split('/').filter(Boolean)
      const maybeId = parts[1] ?? ''
      return YT_ID.test(maybeId) ? maybeId : null
    }
    return null
  } catch {
    return null
  }
}

const getVideos = async (): Promise<Video[]> => {
  const res = await fetch('/api/admin/video', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat video')
  return data as Video[]
}
const createVideo = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/video', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan video')
  return data as ApiResp
}
const updateVideo = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/video', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan perubahan')
  return data as ApiResp
}
const deleteVideo = async (id: string) => {
  const res = await fetch('/api/admin/video', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menghapus video')
  return data as { ok: true; _meta?: { message?: string } }
}

export default function VideoAdminPage() {
  const [items, setItems] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('') // bisa URL penuh atau ID
  const [description, setDescription] = useState('')

  // preview embed
  const ytId = useMemo(() => parseYouTubeIdClient(youtubeUrl), [youtubeUrl])
  const embedSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : null
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getVideos())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat video' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setYoutubeUrl('')
    setDescription('')
  }

  const fillForm = (v: Video) => {
    setEditingId(v.id)
    setTitle(v.title)
    setYoutubeUrl(v.url || '')
    setDescription(v.description ?? '')
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const resp = editingId ? await updateVideo(fd) : await createVideo(fd)
      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Video disimpan.')
      })
      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
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

  const onDelete = async (id: string) => {
    if (!confirm('Yakin hapus video ini?')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const r = await deleteVideo(id)
      setNotice({ type: 'success', text: r?._meta?.message || 'Video dihapus.' })
      if (editingId === id) resetForm()
    } catch (e) {
      setItems(prev)
      setNotice({ type: 'error', text: (e as Error).message })
    }
  }

  const list = useMemo(() => {
    if (loading) return <div className="text-slate-500">Memuat…</div>
    if (!items.length) return <div className="text-slate-500">Belum ada data.</div>
    return (
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((v) => (
          <div key={v.id} className="card">
            {v.thumbnailUrl ? (
              <div className="relative aspect-video mb-2 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnailUrl} alt={v.title} className="object-cover w-full h-full" />
              </div>
            ) : null}
            <div className="font-semibold">{v.title}</div>
            <div className="text-xs text-slate-500 break-all">{v.url}</div>
            {v.description ? <div className="mt-2 text-sm text-slate-600">{v.description}</div> : null}
            <div className="mt-3 flex items-center gap-2">
              <button className="btn" onClick={() => fillForm(v)}>
                Edit
              </button>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(v.id)}>
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Video</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM CREATE / EDIT */}
      <form onSubmit={onSubmit} className="card space-y-4">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit video.</div>
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
            placeholder="Judul video…"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">YouTube URL / ID</label>
          <input
            name="youtubeUrl"
            required={!editingId} // saat edit boleh kosong (tidak ganti)
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="https://youtu.be/xxxxxxxxxxx atau ID 11 karakter"
          />
          <div className="mt-1 text-xs text-slate-500">
            Contoh yang valid: <code>https://youtu.be/…</code>, <code>https://youtube.com/watch?v=…</code>,{' '}
            <code>/shorts/…</code>, <code>/embed/…</code>, atau langsung ID 11 karakter.
          </div>
        </div>

        {/* Preview */}
        {youtubeUrl ? (
          ytId ? (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500 mb-2">Pratinjau</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  <iframe
                    src={embedSrc!}
                    title="Preview YouTube"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb!} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-600">URL/ID YouTube tidak valid.</div>
          )
        ) : null}

        <div>
          <label className="block text-sm mb-1">Deskripsi</label>
          <textarea
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Deskripsi singkat (opsional)"
          />
        </div>

        <button className="btn" disabled={submitting}>
          {submitting ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </form>

      <div className="mt-8">{list}</div>
    </div>
  )
}

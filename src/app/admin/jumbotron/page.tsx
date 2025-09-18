'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Jumbotron = {
  id: number
  title?: string | null
  subtitle?: string | null
  imageUrl?: string | null
}
type Notice = { type: 'success' | 'error'; text: string } | null

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

const getJumbotron = async (): Promise<Jumbotron | null> => {
  const res = await fetch('/api/admin/jumbotron', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat jumbotron')
  return (data ?? null) as Jumbotron | null
}
const saveJumbotron = async (fd: FormData): Promise<Jumbotron & { _meta?: { message?: string } }> => {
  const res = await fetch('/api/admin/jumbotron', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan jumbotron')
  return data as any
}

export default function JumbotronPage() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const [folder, setFolder] = useState('office-site/jumbotron')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const inputFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const j = await getJumbotron()
        if (j) {
          setTitle(j.title ?? '')
          setSubtitle(j.subtitle ?? '')
          setImageUrl(j.imageUrl ?? null)
        }
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat jumbotron' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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

  const onDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const f = e.dataTransfer.files?.[0] ?? null
    if (f) setFile(f)
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('folder', folder)
      // jika tak pilih file, pastikan input file kosong
      if (!file && inputFileRef.current) inputFileRef.current.value = ''

      const saved = await saveJumbotron(fd)
      setNotice({ type: 'success', text: saved?._meta?.message || 'Jumbotron disimpan.' })
      setImageUrl(saved.imageUrl ?? null)
      setFile(null)
      setFilePreview(null)
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container py-10">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Jumbotron</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
        <div>
          <label className="block text-sm mb-1">Judul</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul besar di jumbotron…"
            className="w-full rounded-xl border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Subjudul</label>
          <input
            name="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Deskripsi singkat…"
            className="w-full rounded-xl border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Gambar</label>
          <input
            ref={inputFileRef}
            type="file"
            name="image"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label
            onClick={() => inputFileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={onDrop}
            className="w-full border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:border-primary transition block">
            {filePreview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-md aspect-video overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Preview" className="object-cover w-full h-full" />
                </div>
                <div className="text-xs text-slate-500">Klik untuk ganti file</div>
              </div>
            ) : imageUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-md aspect-video overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Gambar saat ini" className="object-cover w-full h-full" />
                </div>
                <div className="text-xs text-slate-500">Klik untuk mengganti gambar</div>
              </div>
            ) : (
              <div className="text-slate-600">
                <div className="font-medium">Tarik & letakkan gambar di sini</div>
                <div className="text-sm">atau klik untuk memilih</div>
              </div>
            )}
          </label>
          {imageUrl && <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti gambar.</div>}
        </div>

        <button className="btn" disabled={submitting}>
          {submitting ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>

      {loading && <div className="mt-6 text-slate-500">Memuat data…</div>}
    </div>
  )
}

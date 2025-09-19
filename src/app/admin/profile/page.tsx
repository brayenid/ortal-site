'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SimpleWysiwyg } from '@/components/Wysiwyg' // ⬅️ pakai editor kita
import NoticeToast, { Notice } from '@/components/Toast'

type OfficeProfile = {
  id: number
  name: string
  address?: string | null
  email?: string | null
  phone?: string | null
  social?: Record<string, any> | null
  logoUrl?: string | null
  description?: string | null
}

// API helpers
const getProfile = async (): Promise<OfficeProfile | null> => {
  const res = await fetch('/api/admin/profile', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat profil')
  return (data ?? null) as OfficeProfile | null
}
const saveProfile = async (fd: FormData): Promise<OfficeProfile & { _meta?: { message?: string } }> => {
  const res = await fetch('/api/admin/profile', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan profil')
  return data as any
}

export default function ProfilePage() {
  // form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [socialText, setSocialText] = useState('') // textarea JSON
  const [description, setDescription] = useState('') // ⬅️ HTML dari WYSIWYG
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [folder, setFolder] = useState('office-site/profile') // opsional
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const inputFileRef = useRef<HTMLInputElement | null>(null)

  // load data awal → isi form
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const p = await getProfile()
        if (p) {
          setName(p.name ?? '')
          setAddress(p.address ?? '')
          setEmail(p.email ?? '')
          setPhone(p.phone ?? '')
          setLogoUrl(p.logoUrl ?? null)
          setDescription(p.description ?? '') // ⬅️ isi editor
          setSocialText(p.social ? JSON.stringify(p.social, null, 2) : '')
        }
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat profil' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // preview logo baru
  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
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
      // pastikan kirim HTML dari editor
      fd.set('description', description)
      // folder upload (opsional)
      fd.set('folder', folder)
      // kalau tak pilih file, kosongkan input file agar server tak mengira ada file
      if (!file && inputFileRef.current) inputFileRef.current.value = ''

      const saved = await saveProfile(fd)
      setNotice({ type: 'success', text: saved?._meta?.message || 'Profil disimpan.' })

      // sinkronkan state (terutama logoUrl terbaru)
      setLogoUrl(saved.logoUrl ?? null)
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Profil Kantor</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
        <div>
          <label className="block text-sm mb-1">Nama Kantor</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-slate-300"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Alamat</label>
          <textarea
            name="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border-slate-300"
          />
        </div>

        {/* Deskripsi (WYSIWYG) */}
        <div>
          <label className="block text-sm mb-1">Deskripsi Singkat</label>
          {/* hidden input supaya ikut terkirim */}
          <input type="hidden" name="description" value={description} />
          <SimpleWysiwyg
            value={description}
            onChange={setDescription}
            placeholder="Tulis deskripsi singkat kantor di sini…"
          />
          <div className="mt-1 text-xs text-slate-500">
            Gunakan <b>H2/H3</b> untuk subjudul, list, dan quote. Paste otomatis jadi teks biasa (bersih).
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Telepon</label>
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Logo</label>
          <input
            ref={inputFileRef}
            type="file"
            name="logo"
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
            onDrop={onDrop}
            className="w-full border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer hover:border-primary transition block">
            {filePreview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-md aspect-video overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Preview" className="object-contain w-full h-full bg-white" />
                </div>
                <div className="text-sm text-slate-600">{file?.name}</div>
                <div className="text-xs text-slate-500">Klik untuk ganti file</div>
              </div>
            ) : logoUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-md aspect-video overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo saat ini" className="object-contain w-full h-full bg-white" />
                </div>
                <div className="text-xs text-slate-500">Klik untuk mengganti logo</div>
              </div>
            ) : (
              <div className="text-slate-600">
                <div className="font-medium">Tarik & letakkan logo di sini</div>
                <div className="text-sm">atau klik untuk memilih</div>
              </div>
            )}
          </label>
          {logoUrl && <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti logo.</div>}
        </div>

        <div>
          <label className="block text-sm mb-1">Sosial Media (JSON)</label>
          <textarea
            name="social"
            rows={4}
            value={socialText}
            onChange={(e) => setSocialText(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder='{"instagram":"...","facebook":"..."}'
          />
        </div>

        <div className="flex justify-end">
          <button className="btn" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

      {loading && <div className="mt-6 text-slate-500">Memuat profil…</div>}
    </div>
  )
}

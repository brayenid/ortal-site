'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import NoticeToast, { Notice } from '@/components/Toast'

type Employee = { id: string; name: string; position: string; photoUrl?: string | null }
type ApiEmployee = Employee & { _meta?: { message?: string } }

/* -------- API helpers -------- */
const getEmployees = async (): Promise<Employee[]> => {
  const res = await fetch('/api/admin/employee', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat pegawai')
  return data as Employee[]
}
const createEmployee = async (fd: FormData): Promise<ApiEmployee> => {
  const r = await fetch('/api/admin/employee', { method: 'POST', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menambah pegawai')
  return d as ApiEmployee
}
const updateEmployee = async (fd: FormData): Promise<ApiEmployee> => {
  const r = await fetch('/api/admin/employee', { method: 'PUT', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menyimpan perubahan')
  return d as ApiEmployee
}
const deleteEmployee = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const r = await fetch('/api/admin/employee', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menghapus pegawai')
  return d as any
}

/* -------- Page -------- */
export default function EmployeeAdminPage() {
  const [items, setItems] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [folder, setFolder] = useState('office-site/employees') // opsional
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)

  const inputFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getEmployees())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat pegawai' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // preview
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

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPosition('')
    setFolder('office-site/employees')
    setFile(null)
    setFilePreview(null)
    setCurrentPhotoUrl(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  const fillForm = (e: Employee) => {
    setEditingId(e.id)
    setName(e.name)
    setPosition(e.position)
    setCurrentPhotoUrl(e.photoUrl ?? null)
    setFile(null)
    setFilePreview(null)
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (ev) => {
    ev.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(ev.currentTarget)
      // sertakan folder upload (opsional)
      fd.set('folder', folder)
      // kalau tidak memilih file saat edit, pastikan <input type="file"> kosong
      if (!file && inputFileRef.current) inputFileRef.current.value = ''

      const resp = editingId ? await updateEmployee(fd) : await createEmployee(fd)

      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
      } else {
        setItems((prev) => [resp, ...prev])
      }
      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Pegawai ditambahkan.')
      })
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Hapus pegawai ini? Foto terkait akan dihapus dari Cloudinary.')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const r = await deleteEmployee(id)
      setNotice({ type: 'success', text: r?._meta?.message || 'Pegawai dihapus.' })
      if (editingId === id) resetForm()
    } catch (e) {
      setItems(prev)
      setNotice({ type: 'error', text: (e as Error).message })
    }
  }

  const list = useMemo(() => {
    if (loading) return <div className="text-slate-500">Memuat…</div>
    if (items.length === 0) return <div className="text-slate-500">Belum ada data.</div>

    return (
      <div className="grid md:grid-cols-3 gap-3">
        {items.map((e) => (
          <div key={e.id} className="card">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.photoUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}
                alt={e.name}
                className="size-12 rounded-full object-cover bg-slate-100 border border-slate-200"
              />
              <div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-sm text-slate-500">{e.position}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn" onClick={() => fillForm(e)}>
                Edit
              </button>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(e.id)}>
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Pegawai</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM create/edit */}
      <form onSubmit={onSubmit} className="card space-y-4" encType="multipart/form-data">
        {editingId ? (
          <>
            <input type="hidden" name="id" value={editingId} />
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
              <div>Sedang mengedit pegawai.</div>
              <button type="button" className="underline" onClick={resetForm}>
                Batal
              </button>
            </div>
          </>
        ) : null}

        <div>
          <label className="block text-sm mb-1">Nama</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Nama lengkap"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Jabatan</label>
          <input
            name="position"
            required
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="mis. Analis, Staf, Kepala Seksi"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Foto</label>
          <input
            ref={inputFileRef}
            type="file"
            name="photo"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept="image/*"
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
                <div className="relative w-full max-w-md aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Preview" className="object-cover w-full h-full" />
                </div>
                <div className="text-sm text-slate-600">{file?.name}</div>
                <div className="text-xs text-slate-500">Klik untuk ganti file</div>
              </div>
            ) : currentPhotoUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full max-w-md aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentPhotoUrl} alt="Foto saat ini" className="object-cover w-full h-full" />
                </div>
                <div className="text-xs text-slate-500">Klik untuk mengganti foto</div>
              </div>
            ) : (
              <div className="text-slate-600">
                <div className="font-medium">Tarik & letakkan foto di sini</div>
                <div className="text-sm">atau klik untuk memilih</div>
              </div>
            )}
          </label>
          {editingId && currentPhotoUrl && (
            <div className="mt-1 text-xs text-slate-500">Kosongkan jika tidak ingin mengganti foto.</div>
          )}
        </div>

        <div className="flex justify-end">
          <button className="btn" disabled={submitting}>
            {submitting ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </form>

      <div className="mt-8">{list}</div>
    </div>
  )
}

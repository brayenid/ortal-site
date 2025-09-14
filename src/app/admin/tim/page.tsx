'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SimpleWysiwyg } from '@/components/Wysiwyg'

type TeamItem = { id: string; name: string; description?: string | null }
type ApiTeam = TeamItem & { _meta?: { message?: string } }
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

/* -------- API helpers -------- */
const getTeams = async (): Promise<TeamItem[]> => {
  const res = await fetch('/api/admin/team', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat tim')
  return data as TeamItem[]
}
const createTeam = async (fd: FormData): Promise<ApiTeam> => {
  const r = await fetch('/api/admin/team', { method: 'POST', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menambah tim')
  return d as ApiTeam
}
const updateTeam = async (fd: FormData): Promise<ApiTeam> => {
  const r = await fetch('/api/admin/team', { method: 'PUT', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal memperbarui tim')
  return d as ApiTeam
}
const deleteTeam = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const r = await fetch('/api/admin/team', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menghapus tim')
  return d as any
}

/* -------- Page -------- */
export default function TeamAdminPage() {
  const [items, setItems] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getTeams())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat tim' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
  }

  const fillForm = (it: TeamItem) => {
    setEditingId(it.id)
    setName(it.name)
    setDescription(it.description ?? '')
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      // pastikan description (dari WYSIWYG) ikut terkirim
      fd.set('description', description)

      const resp = editingId ? await updateTeam(fd) : await createTeam(fd)

      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
      } else {
        setItems((prev) => [resp, ...prev])
      }

      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Tim ditambahkan.')
      })
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Hapus tim ini?')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const r = await deleteTeam(id)
      setNotice({ type: 'success', text: r?._meta?.message || 'Tim dihapus.' })
      if (editingId === id) resetForm()
    } catch (e) {
      setItems(prev)
      setNotice({ type: 'error', text: (e as Error).message })
    }
  }

  const empty = !loading && items.length === 0

  return (
    <div className="container py-10">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tim Kerja</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM (create/edit) */}
      <form onSubmit={onSubmit} className="card space-y-4">
        {editingId ? (
          <>
            <input type="hidden" name="id" value={editingId} />
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
              <div>Sedang mengedit tim.</div>
              <button type="button" className="underline" onClick={resetForm}>
                Batal
              </button>
            </div>
          </>
        ) : null}

        <div>
          <label className="block text-sm mb-1">Nama Tim</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="mis. Tim Kreatif"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Deskripsi</label>
          {/* penting: form tetap kirim 'description' yang diisi dari WYSIWYG */}
          <input type="hidden" name="description" value={description} />
          <SimpleWysiwyg
            value={description}
            onChange={setDescription}
            placeholder="Tulis deskripsi tugas, ruang lingkup, atau catatan tim…"
          />
        </div>

        <div className="flex justify-end">
          <button className="btn" disabled={submitting}>
            {submitting ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </form>

      {/* LIST */}
      <div className="mt-8">
        {loading ? (
          <div className="text-slate-500">Memuat…</div>
        ) : empty ? (
          <div className="text-slate-500">Belum ada tim.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((t) => (
              <div key={t.id} className="card">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn" onClick={() => fillForm(t)}>
                    Edit
                  </button>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(t.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

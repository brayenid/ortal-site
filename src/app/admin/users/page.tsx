'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NoticeToast from '@/components/Toast'

type Role = 'ADMIN' | 'EDITOR' | 'USER'
type UserLite = { id: string; email: string; name: string | null; role: Role }
type ApiResp = UserLite & { _meta?: { message?: string } }
type Notice = { type: 'success' | 'error'; text: string } | null

/* ---- API wrappers ---- */
const getUsers = async (): Promise<UserLite[]> => {
  const res = await fetch('/api/admin/users', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat pengguna')
  return data as UserLite[]
}

const createUser = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/users', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan pengguna')
  return data as ApiResp
}

const updateUser = async (fd: FormData): Promise<ApiResp> => {
  const res = await fetch('/api/admin/users', { method: 'PUT', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan perubahan')
  return data as ApiResp
}

const deleteUser = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const res = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal menghapus pengguna')
  return data as any
}

/* ---- Badge kecil ---- */
const RoleBadge = ({ role }: { role: Role }) => {
  const cls =
    role === 'ADMIN'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : role === 'EDITOR'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-slate-100 text-slate-700 border-slate-200'
  return <span className={`inline-flex items-center w-min rounded-full border px-2 py-0.5 text-xs ${cls}`}>{role}</span>
}

/* ---- Page ---- */
export default function UsersAdminPage() {
  const [items, setItems] = useState<UserLite[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('EDITOR') // default EDITOR untuk akun baru
  const [password, setPassword] = useState('') // saat edit: opsional

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getUsers())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat pengguna' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setEmail('')
    setRole('EDITOR')
    setPassword('')
  }

  const fillForm = (u: UserLite) => {
    setEditingId(u.id)
    setName(u.name ?? '')
    setEmail(u.email)
    // role ADMIN tidak diubah dari sini (opsional: kunci)
    setRole(u.role === 'ADMIN' ? 'ADMIN' : u.role)
    setPassword('')
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // validasi sederhana
      if (!editingId && password.trim().length < 6) {
        throw new Error('Password minimal 6 karakter.')
      }

      const fd = new FormData(e.currentTarget)
      // Paksa role EDITOR untuk akun baru, sesuai requirement
      if (!editingId) fd.set('role', 'EDITOR')

      const resp = editingId ? await updateUser(fd) : await createUser(fd)
      setNotice({
        type: 'success',
        text: resp?._meta?.message || (editingId ? 'Perubahan disimpan.' : 'Pengguna dibuat.')
      })

      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
      } else {
        setItems((prev) => [...prev, resp].sort((a, b) => a.email.localeCompare(b.email)))
      }
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    const u = items.find((x) => x.id === id)
    if (!u) return
    if (u.role === 'ADMIN') {
      setNotice({ type: 'error', text: 'Akun ADMIN tidak boleh dihapus.' })
      return
    }
    if (!confirm(`Hapus akun ${u.email}?`)) return

    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const res = await deleteUser(id)
      setNotice({ type: 'success', text: res?._meta?.message || 'Akun dihapus.' })
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
        {items.map((u) => (
          <div key={u.id} className="card flex flex-col gap-2">
            <div className="font-semibold break-all">{u.email}</div>
            <div className="text-sm text-slate-700">{u.name || <span className="text-slate-400">—</span>}</div>
            <RoleBadge role={u.role} />
            <div className="mt-2 flex items-center gap-2">
              <button className="btn" onClick={() => fillForm(u)}>
                Edit
              </button>
              <button
                className="btn bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={u.role === 'ADMIN'}
                onClick={() => void onDelete(u.id)}>
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
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Akun</h1>
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* FORM CREATE / EDIT */}
      <form onSubmit={onSubmit} className="card space-y-4">
        {editingId ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
            <div>Sedang mengedit akun.</div>
            <button type="button" className="underline" onClick={resetForm}>
              Batal
            </button>
          </div>
        ) : null}

        {editingId && <input type="hidden" name="id" value={editingId} />}

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="nama@contoh.go.id"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Nama</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Nama lengkap (opsional)"
          />
        </div>

        {/* Role: saat buat akun dikunci ke EDITOR */}
        <div>
          <label className="block text-sm mb-1">Peran</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-xl border-slate-300"
            disabled={!editingId /* akun baru -> selalu EDITOR */}>
            <option value="ADMIN" disabled>
              ADMIN
            </option>
            <option value="EDITOR">EDITOR</option>
            <option value="USER">USER</option>
          </select>
          {!editingId && (
            <div className="mt-1 text-xs text-slate-500">
              Akun baru otomatis sebagai <b>EDITOR</b>.
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">{editingId ? 'Password Baru' : 'Password'}</label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editingId}
            className="w-full rounded-xl border-slate-300"
            placeholder={editingId ? 'Biarkan kosong jika tidak mengubah' : 'Minimal 6 karakter'}
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type FaqItem = { id: string; question: string; answer: string }
type ApiFaq = FaqItem & { _meta?: { message?: string } }
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
const getFaqs = async (): Promise<FaqItem[]> => {
  const res = await fetch('/api/admin/faq', { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Gagal memuat FAQ')
  return data as FaqItem[]
}
const createFaq = async (fd: FormData): Promise<ApiFaq> => {
  const r = await fetch('/api/admin/faq', { method: 'POST', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menambah FAQ')
  return d as ApiFaq
}
const updateFaq = async (fd: FormData): Promise<ApiFaq> => {
  const r = await fetch('/api/admin/faq', { method: 'PUT', body: fd })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal memperbarui FAQ')
  return d as ApiFaq
}
const deleteFaq = async (id: string): Promise<{ ok: true; _meta?: { message?: string } }> => {
  const r = await fetch('/api/admin/faq', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error || 'Gagal menghapus FAQ')
  return d as any
}

/* -------- Page -------- */
export default function FaqAdminPage() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        setItems(await getFaqs())
      } catch (e: any) {
        setNotice({ type: 'error', text: e?.message || 'Gagal memuat FAQ' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setQuestion('')
    setAnswer('')
  }

  const fillForm = (it: FaqItem) => {
    setEditingId(it.id)
    setQuestion(it.question)
    setAnswer(it.answer)
  }

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const resp = editingId ? await updateFaq(fd) : await createFaq(fd)

      if (editingId) {
        setItems((prev) => prev.map((x) => (x.id === resp.id ? resp : x)))
      } else {
        setItems((prev) => [resp, ...prev])
      }

      setNotice({ type: 'success', text: resp?._meta?.message || (editingId ? 'FAQ diperbarui.' : 'FAQ ditambahkan.') })
      resetForm()
    } catch (err) {
      setNotice({ type: 'error', text: (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Hapus FAQ ini?')) return
    const prev = items
    setItems((p) => p.filter((x) => x.id !== id))
    try {
      const r = await deleteFaq(id)
      setNotice({ type: 'success', text: r?._meta?.message || 'FAQ dihapus.' })
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
        <h1 className="text-2xl font-bold">Kelola FAQ</h1>
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
              <div>Sedang mengedit FAQ.</div>
              <button type="button" className="underline" onClick={resetForm}>
                Batal
              </button>
            </div>
          </>
        ) : null}

        <div>
          <label className="block text-sm mb-1">Pertanyaan</label>
          <input
            name="question"
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Tulis pertanyaan…"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Jawaban</label>
          <textarea
            name="answer"
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full rounded-xl border-slate-300"
            placeholder="Tulis jawaban…"
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
          <div className="text-slate-500">Belum ada data.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((f) => (
              <div key={f.id} className="card">
                <div className="font-semibold">{f.question}</div>
                <div className="text-sm text-slate-600 whitespace-pre-line">{f.answer}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="btn" onClick={() => fillForm(f)}>
                    Edit
                  </button>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={() => void onDelete(f.id)}>
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

'use client'

import * as React from 'react'
import { LinksTable } from '@/components/LinksTable'
import type { LinkRow } from '@/types/links'
import type { IconKind } from '@prisma/client'
import Link from 'next/link'
import NoticeToast, { Notice } from '@/components/Toast'

export default function AdminLinksPage(): JSX.Element {
  const [rows, setRows] = React.useState<LinkRow[]>([])
  const [initialRows, setInitialRows] = React.useState<LinkRow[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [notice, setNotice] = React.useState<Notice>(null)

  const safeJson = async (r: Response) => {
    try {
      return await r.json()
    } catch {
      return null
    }
  }

  const fetchLinks = React.useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const r = await fetch('/api/admin/links', { cache: 'no-store' })
      if (!r.ok) throw new Error(`Gagal memuat (${r.status})`)
      const data = await r.json()

      const items: LinkRow[] = (data?.items ?? []).map((x: any, i: number) => ({
        id: String(x.id ?? `${Date.now()}-${i}`), // pastikan string
        label: x.label ?? '',
        url: x.url ?? '',
        newTab: Boolean(x.newTab ?? true),
        order: Number.isFinite(x.order) ? Number(x.order) : i,
        iconKind: (x.iconKind ?? null) as IconKind | null,
        iconName: x.iconName ?? null,
        iconSvg: x.iconSvg ?? null,
        description: x.description ?? null
      }))
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      setRows(items)
      setInitialRows(items)
    } catch (e: any) {
      setNotice({ type: 'error', text: e?.message || 'Gagal memuat data' })
    } finally {
      setLoading(false)
    }
  }, [])

  const saveLinks = React.useCallback(async () => {
    if (saving) return
    setSaving(true)
    setNotice(null)
    try {
      const normalized = rows.map((r, idx) => ({ ...r, order: idx }))

      const r = await fetch('/api/admin/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normalized })
      })
      if (!r.ok) {
        const err = await safeJson(r)
        throw new Error(err?.error || `Gagal menyimpan (${r.status})`)
      }
      const data = await r.json()
      const items: LinkRow[] = (data?.items ?? normalized).map((x: any, i: number) => ({
        id: String(x.id ?? `${Date.now()}-${i}`),
        label: x.label ?? '',
        url: x.url ?? '',
        newTab: Boolean(x.newTab ?? true),
        order: Number.isFinite(x.order) ? Number(x.order) : i,
        iconKind: (x.iconKind ?? null) as IconKind | null,
        iconName: x.iconName ?? null,
        iconSvg: x.iconSvg ?? null,
        description: x.description ?? null
      }))
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      setRows(items)
      setInitialRows(items)
      setNotice({ type: 'success', text: 'Tersimpan!' })
    } catch (e: any) {
      setNotice({ type: 'error', text: e?.message || 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }, [rows, saving])

  const resetToInitial = React.useCallback(() => {
    if (initialRows) setRows(initialRows)
    setNotice(null)
  }, [initialRows])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      await fetchLinks()
      if (!alive) return
    })()
    return () => {
      alive = false
    }
  }, [fetchLinks])

  // Ctrl/Cmd+S = Save
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveLinks()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveLinks])

  const canonical = (arr: LinkRow[]) =>
    (arr || []).map((x, idx) => ({
      id: String(x.id ?? `temp-${idx}`),
      label: x.label ?? '',
      url: x.url ?? '',
      newTab: !!x.newTab,
      order: Number.isFinite(x.order) ? Number(x.order) : idx,
      iconKind: x.iconKind ?? null,
      iconName: x.iconName ?? null,
      iconSvg: x.iconSvg ?? null,
      description: x.description ?? null
    }))

  const dirty = React.useMemo(() => {
    if (!initialRows) return false
    try {
      return JSON.stringify(canonical(initialRows)) !== JSON.stringify(canonical(rows))
    } catch {
      return true
    }
  }, [initialRows, rows])

  return (
    <div className="container p-4 sm:p-6">
      <div
        className="flex justify-end mb-4
      ">
        <Link href="/admin" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">Kelola Tautan</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToInitial}
            disabled={!dirty || loading || saving}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5  text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-base">
            Reset
          </button>
          <button
            type="button"
            onClick={saveLinks}
            disabled={loading || saving}
            className="btn"
            title="Simpan (Ctrl/Cmd+S)">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>

      <NoticeToast notice={notice} onClose={() => setNotice(null)} />

      {loading ? <div className="text-sm text-slate-500">Memuat…</div> : <LinksTable value={rows} onChange={setRows} />}
    </div>
  )
}

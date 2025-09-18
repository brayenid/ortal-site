'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Link as LinkIc, Plus, Trash2 } from 'lucide-react'
import type { LinkRow } from '@/types/links'
import { IconPicker } from './IconPicker'

type Props = {
  value: LinkRow[]
  onChange: (next: LinkRow[]) => void
  /** nama hidden input yang berisi JSON links; default: 'links' */
  nameForForm?: string
}

export const LinksTable = ({ value, onChange, nameForForm = 'links' }: Props): JSX.Element => {
  // === Controlled helpers ===================================================
  const rows = value ?? []

  const setAt = (idx: number, patch: Partial<LinkRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    onChange(next)
  }

  const addRow = () => {
    const next: LinkRow = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      url: '',
      newTab: true,
      order: rows.length,
      iconKind: null,
      iconName: null,
      iconSvg: null,
      description: null
    }
    onChange([...rows, next])
  }

  const removeAt = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i }))
    onChange(next)
  }

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const next = rows.slice()
    const tmp = next[idx]
    next[idx] = next[j]
    next[j] = tmp
    // normalisasi order
    onChange(next.map((r, i) => ({ ...r, order: i })))
  }

  // === UI bits ==============================================================
  const [openIconFor, setOpenIconFor] = useState<number | null>(null)

  const jsonForForm = useMemo(
    () =>
      JSON.stringify(
        rows.map((r, i) => ({
          id: r.id,
          label: r.label ?? '',
          url: r.url ?? '',
          newTab: !!r.newTab,
          order: Number.isFinite(r.order) ? Number(r.order) : i,
          iconKind: r.iconKind ?? null,
          iconName: r.iconName ?? null,
          iconSvg: r.iconSvg ?? null,
          description: r.description ?? null
        }))
      ),
    [rows]
  )

  return (
    <div className="rounded-2xl border border-slate-200">
      {/* Header card */}
      <div className="flex items-center justify-end px-4 py-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center jus">
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Tambah
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th className="w-20 px-3 py-2 text-left">Urut</th>
              <th className="w-24 px-3 py-2 text-left">Ikon</th>
              <th className="w-64 px-3 py-2 text-left">Teks</th>
              <th className="w-[20rem] px-3 py-2 text-left">URL</th>
              <th className="w-[20rem] px-3 py-2 text-left">Deskripsi</th>
              <th className="w-24 px-3 py-2 text-left">Link Baru</th>
              <th className="w-20 px-3 py-2 text-left">Hapus</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  Belum ada link. Klik <b>Tambah</b>.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id ?? idx} className="border-t border-slate-200 align-top">
                  {/* Urut */}
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-col justify-center items-center">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => move(idx, +1)}
                        disabled={idx === rows.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                  {/* Ikon */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenIconFor(openIconFor === idx ? null : idx)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                        {row.iconKind ? 'Ubah Ikon' : 'Pilih Ikon'}
                      </button>
                      {row.iconKind === 'LUCIDE' && row.iconName ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          <LinkIc className="h-4 w-4" /> {row.iconName}
                        </span>
                      ) : row.iconKind === 'SVG' && row.iconSvg ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: sanitizeSVG(row.iconSvg) }}
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>

                    {/* Picker */}
                    {openIconFor === idx && (
                      <div className="mt-2 rounded-lg border border-slate-200 p-3">
                        <IconPicker
                          value={{
                            iconKind: row.iconKind ?? null,
                            iconName: row.iconName ?? null,
                            iconSvg: row.iconSvg ?? null
                          }}
                          onChange={(next) => {
                            setAt(idx, {
                              iconKind: next?.iconKind ?? null,
                              iconName: next?.iconName ?? null,
                              iconSvg: next?.iconSvg ?? null
                            })
                            setOpenIconFor(null)
                          }}
                        />
                      </div>
                    )}
                  </td>

                  {/* Teks */}
                  <td className="px-3 py-2">
                    <input
                      value={row.label ?? ''}
                      onChange={(e) => setAt(idx, { label: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      placeholder="Judul / teks link"
                    />
                  </td>

                  {/* URL */}
                  <td className="px-3 py-2">
                    <input
                      value={row.url ?? ''}
                      onChange={(e) => setAt(idx, { url: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs"
                      placeholder="https://… / mailto:… / tel:…"
                    />
                    <div className="pt-1 text-[11px] text-slate-500">URL valid: http/https/mailto/tel</div>
                  </td>

                  {/* Deskripsi */}
                  <td className="px-3 py-2">
                    <textarea
                      value={row.description ?? ''}
                      onChange={(e) => setAt(idx, { description: e.target.value || null })}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      placeholder="Opsional"
                    />
                  </td>

                  {/* Target */}
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!row.newTab}
                        onChange={(e) => setAt(idx, { newTab: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </label>
                  </td>

                  {/* Hapus */}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                      title="Hapus baris">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer tip */}
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500">
        <LinkIc className="h-4 w-4" />
        URL valid: http/https/mailto/tel. Link eksternal pakai <code>rel="noopener noreferrer"</code>.
      </div>

      {/* Hidden JSON untuk submit form bila diperlukan */}
      <input type="hidden" name={nameForForm} value={jsonForForm} />
    </div>
  )
}

// =============== Utils =======================================================

const sanitizeSVG = (input: string): string => {
  const s = (input || '').trim()
  const hasSVG = /<\s*svg[^>]*>/i.test(s)
  const inner = hasSVG ? s.replace(/^[\s\S]*?<\s*svg[^>]*>/i, '').replace(/<\/\s*svg\s*>[\s\S]*$/i, '') : s
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${inner
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')}</svg>`
}

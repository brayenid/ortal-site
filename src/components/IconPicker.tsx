'use client'

import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import type { IconKind } from '@prisma/client'

type IconValue = {
  iconKind?: IconKind | null
  iconName?: string | null
  iconSvg?: string | null
}

type Props = {
  value?: IconValue
  onChange: (next?: IconValue) => void
}

const COMMON_LUCIDE = [
  'Link',
  'ExternalLink',
  'Globe',
  'Home',
  'FileText',
  'Mail',
  'Phone',
  'Facebook',
  'Instagram',
  'Youtube',
  'X',
  'Github',
  'BookOpen',
  'File',
  'User'
] as const

export const IconPicker = ({ value, onChange }: Props): JSX.Element => {
  const [tab, setTab] = useState<'lucide' | 'svg'>(value?.iconKind === 'SVG' ? 'svg' : 'lucide')
  const [query, setQuery] = useState<string>('')

  const lucideList = useMemo(() => {
    const base = COMMON_LUCIDE.map((n) => ({ name: n, Comp: (Lucide as any)[n] as Lucide.LucideIcon })).filter(
      (x) => typeof x.Comp === 'function'
    )
    if (!query.trim()) return base
    const q = query.toLowerCase()
    return base.filter((x) => x.name.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="rounded-xl border p-3 bg-white w-[min(28rem,100%)]">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={`px-3 py-1.5 rounded-lg border ${
            tab === 'lucide' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
          }`}
          onClick={() => setTab('lucide')}>
          Lucide
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-lg border ${
            tab === 'svg' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
          }`}
          onClick={() => setTab('svg')}>
          Custom SVG
        </button>
        <div className="ml-auto">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => onChange(undefined)}>
            Hapus ikon
          </button>
        </div>
      </div>

      {tab === 'lucide' ? (
        <>
          <div className="mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ikon…"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-6 gap-2 max-h-60 overflow-auto">
            {lucideList.map(({ name, Comp }) => (
              <button
                key={name}
                type="button"
                className={`group border rounded-lg p-2 flex flex-col items-center gap-1 hover:bg-slate-50 ${
                  value?.iconKind === 'LUCIDE' && value.iconName === name ? 'border-slate-900' : 'border-slate-200'
                }`}
                onClick={() => onChange({ iconKind: 'LUCIDE', iconName: name, iconSvg: null })}>
                <Comp size={18} />
                <span className="text-[10px] text-slate-600">{name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <SVGEditor value={value} onChange={onChange} />
      )}
    </div>
  )
}

const SVGEditor = ({ value, onChange }: { value?: IconValue; onChange: (v?: IconValue) => void }) => {
  const [svg, setSvg] = useState<string>(value?.iconKind === 'SVG' ? value.iconSvg ?? '' : '')

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">
        Tempel markup SVG (boleh path saja atau full &lt;svg&gt;…&lt;/svg&gt;).
      </div>
      <textarea
        value={svg}
        onChange={(e) => setSvg(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        placeholder='<svg viewBox="0 0 24 24" ...>...</svg>'
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={() => onChange({ iconKind: 'SVG', iconSvg: svg, iconName: null })}>
          Gunakan SVG
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setSvg('')
            onChange(undefined)
          }}>
          Hapus
        </button>
      </div>
      <div className="pt-1 text-xs text-slate-500">Tips: viewBox 24×24 biar konsisten.</div>
    </div>
  )
}

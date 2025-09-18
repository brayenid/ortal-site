import * as Lucide from 'lucide-react'
import type { LinkRow } from '@/types/links'

export const LinksList = ({ items }: { items: LinkRow[] }): JSX.Element => {
  const sorted = items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <ul className="grid gap-2">
      {sorted.map((it) => (
        <li key={it.id}>
          <a
            href={it.url}
            target={it.newTab ? '_blank' : undefined}
            rel={it.newTab ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <IconView kind={it.iconKind ?? null} name={it.iconName ?? null} svg={it.iconSvg ?? null} />
            <span className="font-medium">{it.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

const IconView = ({ kind, name, svg }: { kind: 'LUCIDE' | 'SVG' | null; name: string | null; svg: string | null }) => {
  if (!kind) return null
  if (kind === 'LUCIDE' && name) {
    const Comp = (Lucide as any)[name] as (p: { size?: number }) => JSX.Element
    return typeof Comp === 'function' ? <Comp size={18} /> : null
  }
  if (kind === 'SVG' && svg) {
    return (
      <span
        className="inline-block w-5 h-5"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }}
      />
    )
  }
  return null
}

const sanitizeSVG = (input: string): string => {
  const s = input.trim()
  const hasSVG = /<\s*svg[^>]*>/i.test(s)
  const inner = hasSVG ? s.replace(/^[\s\S]*?<\s*svg[^>]*>/i, '').replace(/<\/\s*svg\s*>[\s\S]*$/i, '') : s
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${inner
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')}</svg>`
}

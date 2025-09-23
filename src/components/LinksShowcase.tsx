// src/components/LinksShowcase.tsx
import * as Lucide from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/* =========================
 * Types (match schema DB)
 * ========================= */
export type LinkItem = {
  id: string
  label: string
  url: string
  newTab?: boolean
  order?: number
  iconKind?: 'LUCIDE' | 'SVG' | null
  iconName?: string | null
  iconSvg?: string | null
  description?: string | null
}

type Variant = 'card' | 'pill' | 'list'
type Color = 'slate' | 'primary' | 'emerald' | 'amber' | 'rose'
type Size = 'sm' | 'md' | 'lg'
type IconPos = 'left' | 'right' | 'top'
type DescLines = 0 | 1 | 2 | 3 | 4 | 'full'

export type LinksShowcaseProps = {
  // Tidak dipakai di server version, dibiarkan agar kompatibel
  endpoint?: string
  fetchInit?: RequestInit
  noStore?: boolean

  variant?: Variant
  color?: Color
  size?: Size
  iconPosition?: IconPos
  columns?: 1 | 2 | 3 | 4
  className?: string
  relExternal?: string

  /** jumlah baris deskripsi yang ditampilkan (default: 2) */
  descLines?: DescLines
}

/* =========================
 * Utils
 * ========================= */
const clsx = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(' ')

const sanitizeSVG = (input: string): string => {
  const s = (input || '').trim()
  const hasSVG = /<\s*svg[^>]*>/i.test(s)
  const inner = hasSVG ? s.replace(/^[\s\S]*?<\s*svg[^>]*>/i, '').replace(/<\/\s*svg\s*>[\s\S]*$/i, '') : s
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${inner
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')}</svg>`
}

const IconView = ({ item, sizePx = 18 }: { item: LinkItem; sizePx?: number }) => {
  if (!item.iconKind) return null
  if (item.iconKind === 'LUCIDE' && item.iconName) {
    const Comp = (Lucide as any)[item.iconName] as (p: { size?: number }) => JSX.Element
    if (typeof Comp === 'function') return <Comp size={sizePx} />
    return null
  }
  if (item.iconKind === 'SVG' && item.iconSvg) {
    return (
      <span
        className="inline-block p-3 rounded-full bg-red-50 text-rose-600"
        dangerouslySetInnerHTML={{ __html: sanitizeSVG(item.iconSvg) }}
      />
    )
  }
  return null
}

const palette = (color: Color) => {
  switch (color) {
    case 'primary':
      return {
        text: 'text-primary-700',
        ring: 'ring-primary-200',
        border: 'border-primary-200',
        bgHover: 'hover:bg-primary-50'
      }
    case 'emerald':
      return {
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
        border: 'border-emerald-200',
        bgHover: 'hover:bg-emerald-50'
      }
    case 'amber':
      return {
        text: 'text-amber-700',
        ring: 'ring-amber-200',
        border: 'border-amber-200',
        bgHover: 'hover:bg-amber-50'
      }
    case 'rose':
      return { text: 'text-rose-700', ring: 'ring-rose-200', border: 'border-rose-200', bgHover: 'hover:bg-rose-50' }
    default:
      return {
        text: 'text-slate-700',
        ring: 'ring-slate-200',
        border: 'border-slate-200',
        bgHover: 'hover:bg-slate-50'
      }
  }
}

const sizeSpec = (size: Size) => {
  switch (size) {
    case 'sm':
      return { padX: 'px-3', padY: 'py-2', gap: 'gap-2', text: 'text-sm', icon: 16, desc: 'text-xs' }
    case 'lg':
      return {
        padX: 'px-4',
        padY: 'py-2',
        gap: 'gap-3',
        text: 'text-sm sm:text-base',
        icon: 22,
        desc: 'text-xs sm:text-sm'
      }
    default:
      return { padX: 'px-4', padY: 'py-2.5', gap: 'gap-2', text: 'text-sm', icon: 18, desc: 'text-xs' }
  }
}

/** util class untuk clamp deskripsi */
const descClampClass = (lines: DescLines): string => {
  if (lines === 0) return 'hidden'
  if (lines === 'full') return '' // no clamp
  return `line-clamp-${lines}`
}

/* =========================
 * Server Component
 * ========================= */
export default async function LinksShowcase({
  // endpoint, fetchInit, noStore,
  variant = 'card',
  color = 'slate',
  size = 'md',
  iconPosition = 'left',
  columns = 3,
  className,
  relExternal = 'noopener noreferrer',
  descLines = 2
}: LinksShowcaseProps) {
  // Ambil langsung dari DB (urutan berdasarkan 'order')
  const raw = await prisma.link.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      label: true,
      url: true,
      newTab: true,
      order: true,
      iconKind: true,
      iconName: true,
      iconSvg: true,
      description: true
    }
  })

  const data: LinkItem[] = raw.map((x) => ({
    id: String(x.id),
    label: x.label ?? '',
    url: x.url ?? '',
    newTab: !!x.newTab,
    order: x.order ?? 0,
    iconKind: (x.iconKind ?? null) as LinkItem['iconKind'],
    iconName: x.iconName ?? null,
    iconSvg: x.iconSvg ?? null,
    description: x.description ?? null
  }))

  const pal = palette(color)
  const sz = sizeSpec(size)
  const descCls = descClampClass(descLines)

  // ----- list
  if (variant === 'list') {
    return (
      <ul className={clsx('space-y-2', className)}>
        {data.map((it) => {
          const target = it.newTab ? '_blank' : undefined
          const rel = it.newTab ? relExternal : undefined
          return (
            <li key={it.id}>
              <a
                href={it.url}
                target={target}
                rel={rel}
                className={clsx(
                  'group inline-flex items-start rounded-lg border transition',
                  pal.border,
                  pal.bgHover,
                  sz.padX,
                  sz.padY,
                  sz.gap
                )}
                title={it.description || undefined}>
                {iconPosition !== 'right' && <IconView item={it} sizePx={sz.icon} />}
                <div className="min-w-0">
                  <div className={clsx('font-medium', pal.text, sz.text, 'truncate')}>{it.label}</div>
                  {it.description ? (
                    <div className={clsx('text-slate-500', sz.desc, 'max-w-[32rem]', descCls)}>{it.description}</div>
                  ) : null}
                </div>
                {iconPosition === 'right' && <IconView item={it} sizePx={sz.icon} />}
              </a>
            </li>
          )
        })}
      </ul>
    )
  }

  // ----- pill
  if (variant === 'pill') {
    return (
      <div className={clsx('flex flex-wrap gap-2', className)}>
        {data.map((it) => {
          const target = it.newTab ? '_blank' : undefined
          const rel = it.newTab ? relExternal : undefined
          return (
            <a
              key={it.id}
              href={it.url}
              target={target}
              rel={rel}
              className={clsx(
                'inline-flex items-start rounded-full border transition',
                pal.border,
                pal.bgHover,
                sz.padX,
                sz.padY,
                sz.gap
              )}
              title={it.description || undefined}>
              {iconPosition !== 'right' && <IconView item={it} sizePx={sz.icon} />}
              <div className="min-w-0">
                <span className={clsx('font-medium', pal.text)}>{it.label}</span>
                {it.description && (
                  <span className={clsx('block text-slate-500', sz.desc, 'max-w-[28rem]', descCls)}>
                    {it.description}
                  </span>
                )}
              </div>
              {iconPosition === 'right' && <IconView item={it} sizePx={sz.icon} />}
            </a>
          )
        })}
      </div>
    )
  }

  // ----- card (default)
  const gridCols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="container mb-14">
      <h2 className="text-lg sm:text-xl !p-0 !mt-0 mb-4">Daftar Tautan</h2>
      <div className={clsx('grid gap-3', gridCols, className)}>
        {data.map((it) => {
          const target = it.newTab ? '_blank' : undefined
          const rel = it.newTab ? relExternal : undefined
          return (
            <a
              key={it.id}
              href={it.url}
              target={target}
              rel={rel}
              className={clsx(
                'group rounded-xl border bg-white transition hover:translate-y-[-1px] hover:shadow-md',
                pal.border
              )}
              title={it.description || undefined}>
              <div
                className={clsx(
                  'flex',
                  iconPosition === 'top' ? 'flex-col items-start' : 'items-center',
                  sz.padX,
                  sz.padY,
                  sz.gap
                )}>
                {iconPosition !== 'right' && <IconView item={it} sizePx={sz.icon + 4} />}
                <div className="min-w-0 p-2">
                  <div className={clsx('font-semibold', pal.text, sz.text, 'truncate mb-2')}>{it.label}</div>
                  {it.description ? (
                    <div className={clsx('text-slate-500', sz.desc, 'max-w-[32rem]', descCls)}>{it.description}</div>
                  ) : null}
                </div>
                {iconPosition === 'right' && <IconView item={it} sizePx={sz.icon + 4} />}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

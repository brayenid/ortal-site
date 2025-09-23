import Link from 'next/link'

export type Crumb = { name: string; href?: string; icon?: 'home' }

/** maxItemWidth: lebar maksimum (px) untuk tiap crumb non-terakhir agar truncate terjadi */
export default function Breadcrumbs({ items, maxItemWidth = 96 }: { items: Crumb[]; maxItemWidth?: number }) {
  const last = items.length - 1

  return (
    <div className="w-full min-w-0">
      {/* penting untuk parent grid/flex */}
      <nav aria-label="Breadcrumb" className="text-sm max-w-full overflow-hidden">
        <ol className="flex items-center min-w-0 max-w-full overflow-hidden whitespace-nowrap text-slate-500 pl-0">
          {items.map((it, i) => {
            const isLast = i === last
            return (
              <li
                key={`${it.name}-${i}`}
                className={`inline-flex items-center !mt-0 ${isLast ? 'min-w-0 flex-1' : 'flex-none'}`}>
                {i > 0 && <span className="mx-2 text-slate-400 flex-none">›</span>}

                {/* Home icon (opsional) */}
                {it.icon === 'home' ? (
                  <Link href={it.href ?? '/'} aria-label="Beranda" className="flex-none hover:text-slate-900">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ) : !isLast && it.href ? (
                  // crumb non-terakhir: fixed max width + truncate
                  <Link
                    href={it.href}
                    className="block truncate hover:text-slate-900"
                    style={{ maxWidth: `${maxItemWidth}px` }}
                    title={it.name}>
                    {it.name}
                  </Link>
                ) : (
                  <span className="block min-w-0 max-w-full truncate text-slate-900 font-medium" title={it.name}>
                    {it.name}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

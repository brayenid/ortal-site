import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Props = {
  title?: string
  subtitle?: string
  limit?: number
  className?: string
  idAnchor?: string // untuk anchor di beranda (#tim)
  /** jumlah kolom responsif: 1 | 2 | 3 | 4 (default 3) */
  columns?: 1 | 2 | 3 | 4
}

const initial = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '#'

export async function TeamChips({
  title = 'Tim Kerja',
  subtitle = 'Kenali Tim Kerja yang ada di Bagian Organisasi',
  limit,
  className = '',
  idAnchor = 'tim',
  columns = 3
}: Props) {
  const teams = await prisma.team.findMany({
    ...(limit ? { take: limit } : {}),
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  // grid responsif mirip komponen daftar tautan
  const gridCols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section id={idAnchor} className={className}>
      {title ? <h2 className="h3 mb-2 text-lg sm:text-xl">{title}</h2> : null}
      {subtitle ? <p className="pb-4 text-sm sm:text-base">{subtitle}</p> : null}

      {teams.length === 0 ? (
        <div className="text-sm text-slate-500">Belum ada tim.</div>
      ) : (
        <div className={`grid gap-3 ${gridCols}`}>
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/tim/${t.id}`}
              title={t.name}
              className="group rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3 px-4 py-3">
                {/* badge inisial: menyamakan posisi ikon di daftar tautan */}
                <span className="grid size-8 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initial(t.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                    {t.name}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

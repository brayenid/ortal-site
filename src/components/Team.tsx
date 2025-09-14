import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Props = {
  title?: string
  limit?: number
  className?: string
  idAnchor?: string // untuk anchor di beranda (#tim)
}

const initial = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '#'

export async function TeamChips({ title = 'Tim Kerja', limit, className = '', idAnchor = 'tim' }: Props) {
  const teams = await prisma.team.findMany({
    ...(limit ? { take: limit } : {}),
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  })

  return (
    <section id={idAnchor} className={className}>
      {title ? <h2 className="h3 mb-3">{title}</h2> : null}
      <p className="pb-4">Kenali Tim Kerja yang ada di Bagian Organisasi</p>

      <div className="">
        {teams.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada tim.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/tim/${t.id}`}
                title={t.name}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 p-3 text-slate-800 hover:bg-slate-100 transition">
                <span className="grid place-items-center size-5 rounded-full bg-blue-200 text-sm font-semibold text-slate-700">
                  {initial(t.name)}
                </span>
                <span className="truncate min-w-0 max-w-[70vw] sm:max-w-[45vw] md:max-w-[30vw] lg:max-w-full">
                  {t.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

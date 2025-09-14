import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

type Props = { params: { id: string } }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    select: { name: true }
  })
  if (!team) return { title: 'Tim tidak ditemukan' }
  return { title: `${team.name} · Tim Kerja` }
}

const initial = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '#'

export default async function TeamDetailPage({ params }: Props) {
  const [team, others] = await Promise.all([
    prisma.team.findUnique({ where: { id: params.id } }),
    prisma.team.findMany({
      where: { id: { not: params.id } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 20 // atur sesuai selera
    })
  ])

  if (!team) notFound()

  return (
    <div className="container py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <Link href="/#tim" className="text-sm text-secondary">
          ← Kembali
        </Link>
      </div>

      {/* Konten tim */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        {team.description ? (
          <div
            className="prose prose-sm sm:prose-base max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: team.description }}
          />
        ) : (
          <div className="text-slate-500">Belum ada deskripsi untuk tim ini.</div>
        )}
      </div>

      {/* Tim lainnya */}
      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="h4 mb-3">Tim lainnya</h2>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <div className="flex flex-wrap gap-2">
              {others.map((t) => (
                <Link
                  key={t.id}
                  href={`/tim/${t.id}`}
                  title={t.name}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 transition">
                  <span className="grid place-items-center size-5 rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                    {initial(t.name)}
                  </span>
                  <span className="truncate max-w-[14rem]">{t.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// src/app/profil/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

const PAGE_PATH = '/profil'

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export async function generateMetadata(): Promise<Metadata> {
  const p = await prisma.officeProfile.findUnique({ where: { id: 1 } })

  const title = p?.name ? `${p.name} — Profil` : 'Profil Kantor'
  const descRaw = p?.description || (p?.address ? `Alamat: ${p.address}` : '') || 'Profil kantor.'
  const description = stripHtml(descRaw).slice(0, 160)
  const image = p?.logoUrl
  const canonicalUrl = new URL(PAGE_PATH, BASE_URL).toString()

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: { canonical: PAGE_PATH },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: p?.name || 'Website Kantor',
      type: 'website',
      locale: 'id_ID',
      images: image ? [{ url: image, width: 1200, height: 630, alt: p?.name || 'Logo kantor' }] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined
    },
    robots: { index: true, follow: true }
  }
}

export default async function ProfilPage() {
  const [p, heads] = await Promise.all([
    prisma.officeProfile.findUnique({ where: { id: 1 } }),
    prisma.employee.findMany({
      where: { position: 'Kepala Bagian' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, photoUrl: true }
    })
  ])

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">{p?.name ?? 'Profil Kantor'}</h1>

      {p ? (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Kiri: logo & kontak */}
          <aside className="md:col-span-1">
            {p.logoUrl ? (
              <div className="relative w-full aspect-square rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <Image src={p.logoUrl} alt={p.name} fill className="object-contain p-6" />
              </div>
            ) : null}

            <div className="mt-4 card space-y-2">
              {p.address ? (
                <p className="text-sm">
                  <span className="font-medium">Alamat:</span> {p.address}
                </p>
              ) : null}
              {p.email ? (
                <p className="text-sm">
                  <span className="font-medium">Email:</span>{' '}
                  <a className="text-secondary hover:underline" href={`mailto:${p.email}`}>
                    {p.email}
                  </a>
                </p>
              ) : null}
              {p.phone ? (
                <p className="text-sm">
                  <span className="font-medium">Telepon:</span>{' '}
                  <a className="text-secondary hover:underline" href={`tel:${p.phone.replace(/\s+/g, '')}`}>
                    {p.phone}
                  </a>
                </p>
              ) : null}
              {p.social && (
                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Sosial Media</div>
                  <ul className="space-y-1">
                    {Object.entries(p.social as Record<string, string>).map(([k, v]) => (
                      <li key={k} className="text-sm">
                        <a
                          className="text-secondary hover:underline break-all"
                          href={v}
                          target="_blank"
                          rel="noopener noreferrer">
                          {k}: {v}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* Kanan: deskripsi */}
          <section className="md:col-span-2">
            {p.description ? (
              <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: p.description }} />
            ) : (
              <div className="text-slate-600">Belum ada deskripsi.</div>
            )}

            {/* ====== Kepala Bagian ====== */}
            <div className="mt-10">
              {heads.length ? (
                heads.map((e) => (
                  <div key={e.id} className="min-w-0">
                    <div className="font-medium truncate">{e.name}</div>
                    <div className="text-xs text-slate-500">Kepala Bagian</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500">Belum ada data Kepala Bagian.</div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="card text-slate-600">Profil kantor belum diisi.</div>
      )}
    </div>
  )
}

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
  const [p, j] = await Promise.all([
    prisma.officeProfile.findUnique({ where: { id: 1 } }),
    prisma.jumbotron.findUnique({ where: { id: 1 } })
  ])

  const title = p?.name ? `${p.name} - Profil` : 'Profil Kantor'
  const descRaw = p?.description || (p?.address ? `Alamat: ${p.address}` : '') || 'Profil kantor.'
  const description = stripHtml(descRaw).slice(0, 160)
  const image = p?.logoUrl || j?.imageUrl || undefined
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
      images: image ? [{ url: image, width: 1200, height: 630, alt: p?.name || 'Gambar profil' }] : undefined
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

// --- small helpers ---
const initial = (name?: string | null) => name?.trim()?.[0]?.toUpperCase() ?? '#'

const SocialIcon = ({ name }: { name: string }) => {
  const n = name.toLowerCase()
  const cls = 'size-4'
  if (n.includes('instagram')) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden>
        <path
          fill="currentColor"
          d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm6-3a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"
        />
      </svg>
    )
  }
  if (n.includes('facebook')) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden>
        <path fill="currentColor" d="M13 22v-8h3l1-4h-4V7a2 2 0 0 1 2-2h2V1h-3a5 5 0 0 0-5 5v3H6v4h3v8Z" />
      </svg>
    )
  }
  if (n.includes('x.com') || n === 'x' || n.includes('twitter')) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden>
        <path
          fill="currentColor"
          d="M14.79 10.07 22 2h-1.67l-6.26 6.96L9.33 2H2l7.54 10.73L2 22h1.67l6.67-7.41L14.67 22H22l-7.21-11.93ZM11.21 13.5l-.77-1.09L4.4 3.3h3.44l4.96 7.08.77 1.09 6.28 8.96h-3.44l-5.2-7.93Z"
        />
      </svg>
    )
  }
  if (n.includes('youtube')) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden>
        <path
          fill="currentColor"
          d="M23 8s-.2-1.4-.8-2a3.4 3.4 0 0 0-2.3-.8C17.3 5 12 5 12 5s-5.3 0-7.9.2A3.4 3.4 0 0 0 1.8 6C1.2 6.6 1 8 1 8S.8 9.7.8 11.5V13c0 1.8.2 3.5.2 3.5s.2 1.4.8 2a3.9 3.9 0 0 0 2.5.8C6.9 19.5 12 19.5 12 19.5s5.3 0 7.9-.2a3.4 3.4 0 0 0 2.3-.8c.6-.6.8-2 .8-2s.2-1.7.2-3.5v-1.5C23.2 9.7 23 8 23 8Zm-13 6V8.9l6 2.55Z"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden>
      <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Z" />
    </svg>
  )
}

export default async function ProfilPage() {
  const [p, heads, j] = await Promise.all([
    prisma.officeProfile.findUnique({ where: { id: 1 } }),
    prisma.employee.findMany({
      where: { position: 'Kepala Bagian' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, photoUrl: true }
    }),
    prisma.jumbotron.findUnique({ where: { id: 1 } })
  ])

  const headerImage = j?.imageUrl || p?.logoUrl || null

  return (
    <div className="min-h-[60vh] mb-8">
      {/* ===== HERO / JUMBOTRON ===== */}
      <section className="relative isolate">
        {/* BG image + gradient (di bawah) */}
        <div className="absolute inset-0 -z-10">
          {headerImage ? (
            <Image src={headerImage} alt={p?.name || 'Gambar'} fill className="object-cover" priority sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/80 to-blue-500" />
          )}
          {/* gradient dasar */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20" />
        </div>

        {/* SCRIM tambahan (lebih gelap), berada di depan BG/gradient */}
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-black/55 md:bg-black/45 lg:bg-black/35 pointer-events-none"
        />

        {/* Konten di atas scrim */}
        <div className="container relative z-10 py-14 sm:py-20">
          <div className="max-w-3xl text-white">
            <div className="flex items-center gap-4">
              {p?.logoUrl ? (
                <div className="relative size-16 sm:size-20 rounded-xl bg-white/90 ring-1 ring-white/40 overflow-hidden">
                  <Image src={p.logoUrl} alt={p.name || 'Logo'} fill className="object-contain p-2" />
                </div>
              ) : null}
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">{p?.name ?? 'Profil Kantor'}</h1>
                {p?.address ? <p className="text-white/85 text-sm sm:text-base mt-1">{p.address}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BODY ===== */}
      <div className="container -mt-6 sm:-mt-10 relative">
        <div className="grid md:grid-cols-3 gap-6">
          {/* SIDEBAR: Info singkat */}
          <aside className="md:col-span-1 space-y-4">
            {/* Kartu Info Kontak */}
            <div className="card">
              <div className="font-semibold mb-2">Informasi Kontak</div>
              <ul className="space-y-2 text-sm">
                {p?.address && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-4 text-slate-500">📍</span>
                    <span>{p.address}</span>
                  </li>
                )}
                {p?.email && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-4 text-slate-500">✉️</span>
                    <a href={`mailto:${p.email}`} className="text-secondary hover:underline break-all">
                      {p.email}
                    </a>
                  </li>
                )}
                {p?.phone && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-4 text-slate-500">☎️</span>
                    <a href={`tel:${p.phone.replace(/\s+/g, '')}`} className="text-secondary hover:underline">
                      {p.phone}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Kartu Sosial Media */}
            {p?.social && Object.keys(p.social as Record<string, string>).length > 0 && (
              <div className="card">
                <div className="font-semibold mb-2">Sosial Media</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(p.social as Record<string, string>).map(([k, v]) => (
                    <a
                      key={k}
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${k}: ${v}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100 transition">
                      <SocialIcon name={k} />
                      <span className="truncate max-w-[10rem]">{k}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Kepala Bagian ringkas */}
            <div className="card">
              <div className="font-semibold mb-2">Kepala Bagian</div>
              {heads.length ? (
                <ul className="space-y-3">
                  {heads.map((e) => (
                    <li key={e.id} className="flex items-center gap-3">
                      {e.photoUrl ? (
                        <span className="relative size-10 rounded-full overflow-hidden ring-1 ring-slate-200">
                          <Image src={e.photoUrl} alt={e.name} fill className="object-cover" />
                        </span>
                      ) : (
                        <span className="grid place-items-center size-10 rounded-full bg-slate-200 text-slate-700 font-semibold">
                          {initial(e.name)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.name}</div>
                        <div className="text-xs text-slate-500">Kepala Bagian</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">Belum ada data Kepala Bagian.</div>
              )}
            </div>
          </aside>

          {/* MAIN: Deskripsi */}
          <section className="md:col-span-2">
            <div className="card">
              {p?.description ? (
                <article className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: p.description }} />
              ) : (
                <div className="text-slate-600">Belum ada deskripsi.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

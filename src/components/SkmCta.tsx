import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title?: string
  description?: string
  href: string
  buttonText?: string
  className?: string
  icon?: ReactNode
  external?: boolean // set true kalau href eksternal dan mau buka tab baru
}

/**
 * CTA ajakan mengisi SKM.
 * - Background: primary, teks putih
 * - Responsif, sudut rounded, ada aksen dekorasi
 */
export default function SkmCta({
  title = 'Ikuti Survei Kepuasan Masyarakat (SKM)',
  description = 'Bantu kami meningkatkan kualitas layanan dengan mengisi survei singkat berikut.',
  href,
  buttonText = 'Isi SKM',
  className = '',
  icon,
  external = false
}: Props) {
  return (
    <section className={`container my-10 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-primary text-white shadow-lg">
        {/* Dekorasi halus */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        {/* Konten */}
        <div className="relative px-6 py-7 md:px-10 md:py-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="mt-1 inline-flex items-center justify-center rounded-xl bg-white/20">
                {icon ?? <ClipboardCheck className="h-8 w-8 p-2 box-content" aria-hidden="true" />}
              </div>
              <div>
                <h2 className="text-2xl font-extrabold leading-tight md:text-3xl">{title}</h2>
                <p className="mt-1 text-white/90">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={href}
                className="btn !bg-white !text-primary hover:!bg-white/90"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                aria-label={buttonText}>
                {buttonText}
              </Link>

              {/* Link alternatif opsional (hapus kalau tak perlu) */}
              {/* <Link href="/layanan" className="inline-flex text-white/90 hover:text-white">
                Pelajari lebih lanjut →
              </Link> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

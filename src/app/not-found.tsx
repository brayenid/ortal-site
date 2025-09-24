// app/not-found.tsx
import Link from 'next/link'
import { SearchX, Home, Shield, Newspaper } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-2xl">
        <div className="card relative overflow-hidden">
          {/* Accent gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0) 70%)'
            }}
          />

          <div className="relative z-10 flex items-start gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <SearchX size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Halaman tidak ditemukan
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Maaf, alamat yang Anda tuju tidak tersedia atau telah dipindahkan.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/" className="btn inline-flex items-center gap-2">
                  <Home size={16} />
                  Kembali ke Beranda
                </Link>
                <Link
                  href="/artikel"
                  className="btn inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white">
                  <Newspaper size={16} />
                  Jelajahi Artikel
                </Link>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Kode kesalahan: <span className="font-mono">404</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tips pencarian cepat */}
        <div className="mt-3 text-center text-xs text-slate-500">
          Coba periksa kembali URL, atau gunakan menu navigasi untuk menemukan konten yang Anda butuhkan.
        </div>
      </div>
    </div>
  )
}

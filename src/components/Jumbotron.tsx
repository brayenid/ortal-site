import { getJumbotron } from '@/lib/site'
import SearchBar from './SearchBar'
import Image from 'next/image'

/* eslint-disable @next/next/no-img-element */
type Props = {
  children?: React.ReactNode // optional: tombol CTA dsb
}

export default async function Jumbotron({ children }: Props) {
  const jumbotron = await getJumbotron()
  const imageUrl = jumbotron.imageUrl ? jumbotron.imageUrl : '/ortal-bg.jpeg'
  return (
    <section className="relative w-full min-h-screen">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="container">
          <div className="flex min-h-screen items-center py-16">
            <div className="max-w-2xl text-white text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-4">
                <Image
                  src="/berakhlak2.png"
                  alt="berakhlak"
                  className="h-auto w-44 sm:w-56"
                  width={200}
                  height={200}
                  unoptimized
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{jumbotron.title}</h1>
              {jumbotron.subtitle ? (
                <p className="mt-3 text-base md:text-lg text-white/90">{jumbotron.subtitle}</p>
              ) : null}

              {/* Optional CTA */}
              {children ? <div className="mt-6 flex gap-3">{children}</div> : null}

              <SearchBar placeholder="Cari judul atau isi artikel…" className="w-full md:max-w-96 mt-8" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

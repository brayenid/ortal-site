'use client'

import * as React from 'react'

export type FaqItem = {
  id: string
  question: string
  answer: string
  slug: string
}

type AccordionItemProps = {
  item: FaqItem
}

function AccordionItem({ item }: AccordionItemProps) {
  const [open, setOpen] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = React.useState<number | 'auto'>(0)

  const toggle = () => {
    const el = contentRef.current

    if (!el) return

    if (!open) {
      // OPEN: set height ke scrollHeight dulu biar bisa transisi,
      // lalu setelah transisi selesai, kunci ke 'auto' agar responsif.
      const target = el.scrollHeight
      setHeight(target)
      setOpen(true)
    } else {
      // CLOSE: set height ke current offsetHeight lalu frame berikutnya ke 0
      const current = el.getBoundingClientRect().height
      setHeight(current)
      // perlu frame berikutnya supaya browser apply height current dulu
      requestAnimationFrame(() => setHeight(0))
      setOpen(false)
    }
  }

  // Saat open selesai, switch ke auto agar konten bisa bertambah tanpa patah
  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'height') return
    if (open) setHeight('auto')
  }

  // Jika sedang open dan konten berubah (mis. font dimuat), perbarui height
  React.useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return
    // kalau height 'auto', set dulu ke angka untuk bisa diubah
    setHeight(el.scrollHeight)
  }, [open])

  return (
    <li className="min-w-0 !mt-0">
      <div className="rounded-2xl border border-slate-200 bg-white p-2 px-4 shadow-sm transition hover:shadow-md">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={item.slug}
          onClick={toggle}
          className="w-full flex items-start justify-between gap-4 text-left">
          <h3 className="text-base sm:text-lg font-medium text-slate-900 min-w-0">
            <span className="block truncate">{item.question}</span>
          </h3>
          <span
            aria-hidden
            className={`mt-0.5 inline-grid size-7 place-items-center rounded-full border text-white transition ${
              open ? 'rotate-45 bg-primary' : 'bg-primary'
            }`}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" />
            </svg>
          </span>
        </button>

        {/* Panel konten */}
        <div
          id={item.slug}
          ref={contentRef}
          style={{ height, overflow: 'hidden', transition: 'height 300ms ease-in-out' }}
          onTransitionEnd={onTransitionEnd}
          className={`mt-3`}>
          <div
            className={`text-sm text-slate-700 transition-opacity duration-300 ease-in-out ${
              open ? 'opacity-100' : 'opacity-0'
            }`}>
            <p className="whitespace-pre-line mb-4">{item.answer}</p>
          </div>
        </div>
      </div>
    </li>
  )
}

export function FAQList({ items }: { items: FaqItem[] }) {
  // Bagi dua kolom: 0..mid-1 kiri, sisanya kanan
  const mid = Math.ceil(items.length / 2)
  const left = items.slice(0, mid)
  const right = items.slice(mid)

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Kolom kiri */}
      <ul className="flex-1 m-0 list-none !pl-0 flex flex-col gap-4">
        {left.map((it) => (
          <AccordionItem key={it.id} item={it} />
        ))}
      </ul>

      {/* Kolom kanan */}
      <ul className="flex-1 m-0 list-none !pl-0 flex flex-col gap-4">
        {right.map((it) => (
          <AccordionItem key={it.id} item={it} />
        ))}
      </ul>
    </div>
  )
}

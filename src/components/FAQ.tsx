import { prisma } from '@/lib/prisma'
import { FAQList, FaqItem } from './FAQList'

const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

export async function FAQ() {
  const items = await prisma.faq.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8
  })

  // mapping ke bentuk yang dipakai client
  const data: FaqItem[] = items.map((f) => ({
    id: String(f.id),
    question: f.question,
    answer: f.answer,
    slug: `faq-${slugify(f.question)}`
  }))

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                <path
                  d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm.75 15h-1.5v-1.5h1.5Zm1.86-6.14-.67.69A3.076 3.076 0 0 0 13 14h-1.5v-.38a3.46 3.46 0 0 1 1-2.45l.92-.94a1.5 1.5 0 1 0-2.57-1.06H9.25a3 3 0 1 1 6 0 2.47 2.47 0 0 1-.64 1.41Z"
                  fill="currentColor"
                />
              </svg>
              FAQ
            </div>
            <h2 className="text-lg sm:text-xl mb-4">Pertanyaan Yang Sering Diajukan</h2>
            <p className="mt-1 text-slate-600">Temukan jawaban cepat.</p>
          </div>
        </div>

        {/* List */}
        {data.length === 0 ? <div className="card text-slate-600">Belum ada FAQ.</div> : <FAQList items={data} />}
      </div>
    </section>
  )
}

import { prisma } from '@/lib/prisma'

export async function FAQ() {
  const items = await prisma.faq.findMany({ orderBy: { createdAt: 'desc' }, take: 8 })
  return (
    <section className="bg-slate-50">
      <div className="container py-10">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Pertanyaan Yang Sering Diajukan</h2>
        <div className="grid md:grid-cols-1 gap-4">
          {items.map((f) => (
            <details key={f.id} className="card">
              <summary className="text-sm sm:text-base first:cursor-pointer font-medium">{f.question}</summary>
              <p className="mt-2 text-sm text-slate-700">{f.answer}</p>
            </details>
          ))}
          {items.length === 0 && <div className="text-slate-500">Belum ada FAQ.</div>}
        </div>
      </div>
    </section>
  )
}

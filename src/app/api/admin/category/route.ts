import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/* ---------- util slug ---------- */
const slugify = (raw: string): string =>
  (raw ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

const resolveUniqueSlug = async (base: string, excludeId?: string) => {
  const clean = slugify(base)
  const whereBase = { slug: { startsWith: clean } } as const
  const existing = await prisma.category.findMany({
    where: excludeId ? { ...whereBase, NOT: { id: excludeId } } : whereBase,
    select: { slug: true }
  })
  const set = new Set(existing.map((e) => e.slug))
  if (!set.has(clean)) return { slug: clean, adjusted: false }
  let i = 2
  while (set.has(`${clean}-${i}`)) i++
  return { slug: `${clean}-${i}`, adjusted: true }
}

/* ---------- GET: list ---------- */
export async function GET() {
  try {
    const items = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } }
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

/* ---------- POST: create ---------- */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const name = (form.get('name') as string) ?? ''
    const rawSlug = (form.get('slug') as string) ?? name
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

    const { slug, adjusted } = await resolveUniqueSlug(rawSlug)
    const created = await prisma.category.create({ data: { name, slug } })
    return NextResponse.json(
      {
        ...created,
        _meta: { message: adjusted ? `Slug dipakai, diubah ke "${slug}".` : 'Kategori disimpan.' }
      },
      { status: 201 }
    )
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 })
    return NextResponse.json({ error: 'Gagal menyimpan kategori' }, { status: 500 })
  }
}

/* ---------- PUT: update ---------- */
export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const id = (form.get('id') as string) ?? ''
    const name = (form.get('name') as string) ?? ''
    const rawSlug = (form.get('slug') as string) ?? name
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

    const { slug, adjusted } = await resolveUniqueSlug(rawSlug, id)
    const updated = await prisma.category.update({ where: { id }, data: { name, slug } })
    return NextResponse.json({
      ...updated,
      _meta: { message: adjusted ? `Slug diubah ke "${slug}".` : 'Perubahan disimpan.' }
    })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 })
    return NextResponse.json({ error: 'Gagal menyimpan perubahan' }, { status: 500 })
  }
}

/* ---------- DELETE: delete ---------- */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const usedCount = await prisma.article.count({ where: { categoryId: body.id } })
    if (usedCount > 0) {
      return NextResponse.json({ error: `Tidak bisa dihapus. Dipakai di ${usedCount} artikel.` }, { status: 409 })
    }

    await prisma.category.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true, _meta: { message: 'Kategori dihapus.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 })
  }
}

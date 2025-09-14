import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET: list atau detail (?id=) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (id) {
      const item = await prisma.team.findUnique({ where: { id } })
      if (!item) return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 })
      return NextResponse.json(item)
    }

    const items = await prisma.team.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data tim' }, { status: 500 })
  }
}

/** POST: create */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const name = (form.get('name') as string) ?? ''
    const description = (form.get('description') as string) ?? ''

    if (!name.trim()) return NextResponse.json({ error: 'Nama tim wajib diisi' }, { status: 400 })

    const created = await prisma.team.create({
      data: { name, description }
    })
    return NextResponse.json({ ...created, _meta: { message: 'Tim berhasil ditambahkan.' } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal menambah tim' }, { status: 500 })
  }
}

/** PUT: update */
export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const id = (form.get('id') as string) ?? ''
    const name = (form.get('name') as string) ?? ''
    const description = (form.get('description') as string) ?? ''

    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!name.trim()) return NextResponse.json({ error: 'Nama tim wajib diisi' }, { status: 400 })

    const updated = await prisma.team.update({
      where: { id },
      data: { name, description }
    })
    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal memperbarui tim' }, { status: 500 })
  }
}

/** DELETE: hapus */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    await prisma.team.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true, _meta: { message: 'Tim dihapus.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal menghapus tim' }, { status: 500 })
  }
}

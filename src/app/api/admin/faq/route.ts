import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getActor() {
  const session = await getServerSession(authConfig)
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return (session as any).user.id as string
}

/** LIST */
export async function GET() {
  try {
    const items = await prisma.faq.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil FAQ' }, { status: 500 })
  }
}

/** CREATE */
export async function POST(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const question = (form.get('question') as string) ?? ''
    const answer = (form.get('answer') as string) ?? ''
    if (!question.trim()) return NextResponse.json({ error: 'Pertanyaan wajib diisi' }, { status: 400 })

    const created = await prisma.faq.create({
      data: { question, answer, createdById: actorId, updatedById: actorId }
    })
    return NextResponse.json({ ...created, _meta: { message: 'FAQ ditambahkan.' } }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menambah FAQ' }, { status: 500 })
  }
}

/** UPDATE */
export async function PUT(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const id = (form.get('id') as string) ?? ''
    const question = (form.get('question') as string) ?? ''
    const answer = (form.get('answer') as string) ?? ''
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!question.trim()) return NextResponse.json({ error: 'Pertanyaan wajib diisi' }, { status: 400 })

    const updated = await prisma.faq.update({
      where: { id },
      data: { question, answer, updatedById: actorId }
    })
    return NextResponse.json({ ...updated, _meta: { message: 'FAQ diperbarui.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'FAQ tidak ditemukan' }, { status: 404 })
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal memperbarui FAQ' }, { status: 500 })
  }
}

/** DELETE */
export async function DELETE(req: Request) {
  try {
    await getActor()

    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    await prisma.faq.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true, _meta: { message: 'FAQ dihapus.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'FAQ tidak ditemukan' }, { status: 404 })
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menghapus FAQ' }, { status: 500 })
  }
}

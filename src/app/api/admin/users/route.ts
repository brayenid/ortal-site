import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function assertCanManage() {
  const session = await getServerSession(authConfig)
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

/* =========================
 * GET /api/admin/users
 * ========================= */
export async function GET() {
  try {
    await assertCanManage()
    const users = await prisma.user.findMany({
      orderBy: { email: 'asc' },
      select: { id: true, email: true, name: true, role: true }
    })
    return NextResponse.json(users)
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Failed to load users' }, { status: 500 })
  }
}

/* =========================
 * POST /api/admin/users
 * Body: FormData (email, name?, password [min 6])
 * Role selalu dipaksa EDITOR
 * ========================= */
export async function POST(req: Request) {
  try {
    await assertCanManage()
    const fd = await req.formData()
    const email = String(fd.get('email') || '')
      .trim()
      .toLowerCase()
    const name = (fd.get('name') as string) || null
    const password = String(fd.get('password') || '')

    if (!email) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)

    const created = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
        role: 'EDITOR' // paksa EDITOR
      },
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({ ...created, _meta: { message: 'Pengguna dibuat sebagai EDITOR.' } })
  } catch (e: any) {
    // Unique email violation
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 400 })
    }
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Failed to create user' }, { status: 500 })
  }
}

/* =========================
 * PUT /api/admin/users
 * Body: FormData (id, email?, name?, role?, password?)
 * password opsional; jika ada → update hash
 * ========================= */
export async function PUT(req: Request) {
  try {
    await assertCanManage()

    const fd = await req.formData()
    const id = String(fd.get('id') || '')
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

    const emailRaw = fd.get('email')
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : undefined
    const name = (fd.get('name') as string) ?? undefined
    const role = (fd.get('role') as 'ADMIN' | 'EDITOR' | 'USER') ?? undefined
    const password = (fd.get('password') as string) ?? ''

    const current = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (current?.role === 'ADMIN' && role && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Role ADMIN tidak boleh diubah.' }, { status: 400 })
    }

    const data: any = {}
    if (email !== undefined) data.email = email
    if (name !== undefined) data.name = name || null
    if (role !== undefined) data.role = role

    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
      }
      data.passwordHash = await bcrypt.hash(password, 10)
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah dipakai pengguna lain.' }, { status: 400 })
    }
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Failed to update user' }, { status: 500 })
  }
}

/* =========================
 * DELETE /api/admin/users
 * Body: JSON { id }
 * ADMIN tidak boleh dihapus
 * ========================= */
export async function DELETE(req: Request) {
  try {
    await assertCanManage()
    const body = await req.json().catch(() => ({}))
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } })
    if (!user) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Akun ADMIN tidak boleh dihapus.' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true, _meta: { message: `Akun ${user.email} dihapus.` } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Failed to delete user' }, { status: 500 })
  }
}

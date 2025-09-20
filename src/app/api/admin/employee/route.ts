import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
import { v2 as cloudinary } from 'cloudinary'
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

/* -------- util cloudinary (sesuai pola artikel/profile) -------- */
const parseCloudinaryPublicId = (secureUrl?: string | null) => {
  if (!secureUrl) return null
  try {
    const u = new URL(secureUrl)
    // /<cloud>/<resource_type>/upload/<v123>/folder/name.ext
    const parts = u.pathname.split('/').filter(Boolean)
    const resourceType = parts[1] === 'video' ? 'video' : 'image'
    const uploadIdx = parts.findIndex((p) => p === 'upload')
    if (uploadIdx === -1) return null
    const afterUpload = parts.slice(uploadIdx + 1)
    const withoutVersion = afterUpload[0]?.startsWith('v') ? afterUpload.slice(1) : afterUpload
    const fileWithExt = withoutVersion.join('/')
    const lastDot = fileWithExt.lastIndexOf('.')
    const publicId = lastDot === -1 ? fileWithExt : fileWithExt.slice(0, lastDot)
    return { publicId, resourceType: resourceType as 'image' | 'video' }
  } catch {
    return null
  }
}

const destroyCloudinaryByUrl = async (secureUrl?: string | null) => {
  const parsed = parseCloudinaryPublicId(secureUrl)
  if (!parsed) return { ok: false, error: 'public_id not parsed' }
  const res = await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType })
  return { ok: res?.result === 'ok' || res?.result === 'not found', res }
}

/* -------- GET: list / (optional ?id=detail) -------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (id) {
      const item = await prisma.employee.findUnique({ where: { id } })
      if (!item) return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 })
      return NextResponse.json(item)
    }

    const items = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, position: true, photoUrl: true }
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data pegawai' }, { status: 500 })
  }
}

/* -------- POST: create (audit createdById & updatedById) -------- */
export async function POST(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const name = (form.get('name') as string) ?? ''
    const position = (form.get('position') as string) ?? ''
    const photo = (form.get('photo') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site/employees'

    if (!name.trim() || !position.trim()) {
      return NextResponse.json({ error: 'Nama dan jabatan wajib diisi' }, { status: 400 })
    }

    const hasPhoto = photo && photo.size > 0
    const photoUrl = hasPhoto ? await maybeUploadFile(photo!, folder) : undefined

    const created = await prisma.employee.create({
      data: {
        name,
        position,
        photoUrl,
        createdById: actorId,
        updatedById: actorId
      }
    })

    return NextResponse.json({ ...created, _meta: { message: 'Pegawai berhasil ditambahkan.' } }, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menambah pegawai' }, { status: 500 })
  }
}

/* -------- PUT: update (pertahankan foto lama; audit updatedById) -------- */
export async function PUT(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const id = (form.get('id') as string) ?? ''
    const name = (form.get('name') as string) ?? ''
    const position = (form.get('position') as string) ?? ''
    const photo = (form.get('photo') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site/employees'

    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!name.trim() || !position.trim()) {
      return NextResponse.json({ error: 'Nama dan jabatan wajib diisi' }, { status: 400 })
    }

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 })

    const hasNewPhoto = photo && photo.size > 0
    let photoUrl: string | undefined
    if (hasNewPhoto) {
      if (existing.photoUrl) {
        try {
          await destroyCloudinaryByUrl(existing.photoUrl)
        } catch {}
      }
      photoUrl = await maybeUploadFile(photo!, folder)
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name,
        position,
        ...(hasNewPhoto ? { photoUrl } : {}),
        updatedById: actorId
      }
    })

    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal memperbarui pegawai' }, { status: 500 })
  }
}

/* -------- DELETE: hapus + hapus foto Cloudinary (auth) -------- */
export async function DELETE(req: Request) {
  try {
    await getActor()

    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const existing = await prisma.employee.findUnique({
      where: { id: body.id },
      select: { id: true, photoUrl: true }
    })
    if (!existing) return NextResponse.json({ error: 'Pegawai tidak ditemukan' }, { status: 404 })

    if (existing.photoUrl) {
      try {
        await destroyCloudinaryByUrl(existing.photoUrl)
      } catch {}
    }

    await prisma.employee.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true, _meta: { message: 'Pegawai dihapus.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menghapus pegawai' }, { status: 500 })
  }
}

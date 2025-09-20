import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
import { v2 as cloudinary } from 'cloudinary'
import imageSize from 'image-size'
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
  return (session as any)?.user?.id as string
}

/** VALIDASI RASIO */
const TARGET_RATIO = 4 / 1
const TOLERANCE = 0.08
const MIN_WIDTH = 1200
const FOLDER_DEFAULT = process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site/banners'

function ratioOk(w: number, h: number): boolean {
  const r = w / h
  const low = TARGET_RATIO * (1 - TOLERANCE)
  const high = TARGET_RATIO * (1 + TOLERANCE)
  return r >= low && r <= high
}

/** Util: parse public_id dari URL cloudinary */
const parseCloudinaryPublicId = (secureUrl: string | null | undefined) => {
  if (!secureUrl) return null
  try {
    const u = new URL(secureUrl)
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

/** GET: list */
export async function GET() {
  try {
    const list = await prisma.banner.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
    })
    return NextResponse.json(list)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

/** POST: create (+ audit createdById/updatedById) */
export async function POST(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const title = (form.get('title') as string)?.trim()
    const description = ((form.get('description') as string) || '').trim()
    const linkUrlRaw = ((form.get('linkUrl') as string) || '').trim()
    const file = (form.get('image') as File) ?? null
    const folder = (form.get('folder') as string) || FOLDER_DEFAULT
    const published = (form.get('published') as string) === 'on'

    if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Gambar banner wajib diunggah' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const dims = imageSize(buf as Uint8Array)
    if (!dims.width || !dims.height) {
      return NextResponse.json({ error: 'Gagal membaca dimensi gambar' }, { status: 400 })
    }
    if (dims.width < MIN_WIDTH) {
      return NextResponse.json({ error: `Lebar minimum ${MIN_WIDTH}px. Gambar Anda: ${dims.width}px` }, { status: 400 })
    }
    if (!ratioOk(dims.width, dims.height)) {
      const ratio = (dims.width / dims.height).toFixed(2)
      return NextResponse.json({ error: `Rasio harus ~3:1 (±8%). Rasio gambar: ${ratio}` }, { status: 400 })
    }

    const imageUrl = await maybeUploadFile(file, folder)

    const linkUrl =
      linkUrlRaw && /^(https?:)?\/\//i.test(linkUrlRaw)
        ? linkUrlRaw.startsWith('http')
          ? linkUrlRaw
          : `https:${linkUrlRaw}`
        : linkUrlRaw || undefined

    const created = await prisma.banner.create({
      data: {
        title,
        description: description || undefined,
        linkUrl,
        imageUrl: imageUrl as string,
        width: dims.width!,
        height: dims.height!,
        published,
        createdById: actorId,
        updatedById: actorId
      }
    })

    return NextResponse.json({ ...created, _meta: { message: 'Banner ditambahkan.' } } as any, { status: 201 })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menyimpan banner' }, { status: 500 })
  }
}

/** PUT: update (+ audit updatedById) */
export async function PUT(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const id = (form.get('id') as string | null) ?? ''
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })

    const titleInput = (form.get('title') as string | null)?.trim() ?? ''
    if (!titleInput) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
    const title = titleInput

    const descInput = form.get('description') as string | null
    const description = descInput === null ? undefined : descInput.trim() === '' ? null : descInput.trim()

    const linkInput = form.get('linkUrl') as string | null
    let linkUrl: string | null | undefined
    if (linkInput === null) {
      linkUrl = undefined
    } else {
      const raw = linkInput.trim()
      if (raw === '') linkUrl = null
      else if (raw.startsWith('/') || raw.startsWith('#')) linkUrl = raw
      else if (/^https?:\/\//i.test(raw)) linkUrl = raw
      else if (/^\/\//.test(raw)) linkUrl = 'https:' + raw
      else linkUrl = 'https://' + raw
    }

    const publishedInput = form.get('published') as string | null
    const published =
      publishedInput === null ? undefined : ['on', 'true', '1', 'yes'].includes(publishedInput.toLowerCase())

    const file = form.get('image') as File | null
    const folder = ((form.get('folder') as string | null) ?? FOLDER_DEFAULT).trim() || FOLDER_DEFAULT

    let imageUrl: string | undefined
    let width: number | undefined
    let height: number | undefined

    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      const dims = imageSize(buf as Uint8Array)
      if (!dims.width || !dims.height) {
        return NextResponse.json({ error: 'Gagal membaca dimensi gambar' }, { status: 400 })
      }
      if (dims.width < MIN_WIDTH) {
        return NextResponse.json(
          { error: `Lebar minimum ${MIN_WIDTH}px. Gambar Anda: ${dims.width}px` },
          { status: 400 }
        )
      }
      if (!ratioOk(dims.width, dims.height)) {
        const ratio = (dims.width / dims.height).toFixed(2)
        return NextResponse.json({ error: `Rasio harus ~3:1 (±8%). Rasio gambar: ${ratio}` }, { status: 400 })
      }

      if (existing.imageUrl) {
        try {
          await destroyCloudinaryByUrl(existing.imageUrl)
        } catch {}
      }
      imageUrl = await maybeUploadFile(file, folder)
      width = dims.width
      height = dims.height
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title,
        ...(description === undefined ? {} : { description }),
        ...(linkUrl === undefined ? {} : { linkUrl }),
        ...(published === undefined ? {} : { published }),
        ...(imageUrl ? { imageUrl } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        updatedById: actorId
      }
    })

    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menyimpan perubahan' }, { status: 500 })
  }
}

/** PATCH: publish/order (+ audit updatedById) */
export async function PATCH(req: Request) {
  try {
    const actorId = await getActor()
    const body = (await req.json()) as { id?: string; published?: boolean; order?: number }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    const updated = await prisma.banner.update({
      where: { id: body.id },
      data: {
        ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
        ...(typeof body.order === 'number' ? { order: body.order } : {}),
        updatedById: actorId
      }
    })
    return NextResponse.json({ ...updated, _meta: { message: 'Banner diperbarui.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal memperbarui banner' }, { status: 500 })
  }
}

/** DELETE (+ auth; audit not needed) */
export async function DELETE(req: Request) {
  try {
    await getActor()
    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const existing = await prisma.banner.findUnique({ where: { id: body.id }, select: { imageUrl: true } })
    if (!existing) return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })

    if (existing.imageUrl) {
      try {
        await destroyCloudinaryByUrl(existing.imageUrl)
      } catch {}
    }
    await prisma.banner.delete({ where: { id: body.id } })

    return NextResponse.json({ ok: true, _meta: { message: 'Banner dihapus.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menghapus banner' }, { status: 500 })
  }
}

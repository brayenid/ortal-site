import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
import { v2 as cloudinary } from 'cloudinary'
import imageSize from 'image-size'

/** VALIDASI RASIO */
const TARGET_RATIO = 4 / 1 // 3:1 (horizontal memanjang)
const TOLERANCE = 0.08 // +-8% toleransi
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

/** POST: create */
export async function POST(req: Request) {
  try {
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

    // validasi dimensi
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

    // upload
    const imageUrl = await maybeUploadFile(file, folder)

    // optional link normalize
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
        width: dims.width,
        height: dims.height,
        published
      }
    })

    return NextResponse.json({ ...created, _meta: { message: 'Banner ditambahkan.' } }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan banner' }, { status: 500 })
  }
}

/** PUT: update */
export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const id = (form.get('id') as string | null) ?? ''
    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Banner tidak ditemukan' }, { status: 404 })

    // --- Title (wajib)
    const titleInput = (form.get('title') as string | null)?.trim() ?? ''
    if (!titleInput) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
    const title = titleInput

    // --- Description: izinkan kosong => NULL
    //    undefined = tidak ada field di form (tetap), null = set NULL, string = update
    const descInput = form.get('description') as string | null
    const description =
      descInput === null
        ? undefined // tidak dikirim => biarkan nilai sebelumnya
        : descInput.trim() === ''
        ? null // dikirim tapi kosong => set NULL
        : descInput.trim()

    // --- Link: izinkan kosong => NULL, normalisasi skema (https) jika perlu
    const linkInput = form.get('linkUrl') as string | null
    let linkUrl: string | null | undefined
    if (linkInput === null) {
      linkUrl = undefined // tidak dikirim => biarkan
    } else {
      const raw = linkInput.trim()
      if (raw === '') linkUrl = null // kosong => set NULL
      else if (raw.startsWith('/') || raw.startsWith('#')) linkUrl = raw // internal/hash
      else if (/^https?:\/\//i.test(raw)) linkUrl = raw // sudah http/https
      else if (/^\/\//.test(raw)) linkUrl = 'https:' + raw // protocol-relative
      else linkUrl = 'https://' + raw // tambahkan https
    }

    // --- Published: jika field dikirim, update; kalau tidak, biarkan
    const publishedInput = form.get('published') as string | null
    const published =
      publishedInput === null ? undefined : ['on', 'true', '1', 'yes'].includes(publishedInput.toLowerCase())

    // --- Gambar (opsional saat update)
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

      // Hapus lama lalu upload baru
      if (existing.imageUrl) {
        try {
          await destroyCloudinaryByUrl(existing.imageUrl)
        } catch {
          // abaikan kegagalan hapus lama
        }
      }
      imageUrl = await maybeUploadFile(file, folder)
      width = dims.width
      height = dims.height
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title,
        ...(description === undefined ? {} : { description }), // bisa null
        ...(linkUrl === undefined ? {} : { linkUrl }), // bisa null
        ...(published === undefined ? {} : { published }),
        ...(imageUrl ? { imageUrl } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {})
      }
    })

    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Gagal menyimpan perubahan' }, { status: 500 })
  }
}

/** PATCH: publish/order */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; published?: boolean; order?: number }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    const updated = await prisma.banner.update({
      where: { id: body.id },
      data: {
        ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
        ...(typeof body.order === 'number' ? { order: body.order } : {})
      }
    })
    return NextResponse.json({ ...updated, _meta: { message: 'Banner diperbarui.' } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Gagal memperbarui banner' }, { status: 500 })
  }
}

/** DELETE */
export async function DELETE(req: Request) {
  try {
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
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus banner' }, { status: 500 })
  }
}

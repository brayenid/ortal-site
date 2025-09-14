import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
import { v2 as cloudinary } from 'cloudinary'

/* ---------- util slug ---------- */
const slugify = (raw: string): string =>
  raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-')

const humanizeSlug = (s: string): string =>
  s
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const resolveUniqueSlug = async (base: string, excludeId?: string) => {
  const clean = slugify(base)
  const existing = await prisma.article.findMany({
    where: excludeId ? { slug: { startsWith: clean }, NOT: { id: excludeId } } : { slug: { startsWith: clean } },
    select: { slug: true }
  })
  const set = new Set(existing.map((e) => e.slug))
  if (!set.has(clean)) return { slug: clean, adjusted: false }
  let i = 2
  while (set.has(`${clean}-${i}`)) i++
  return { slug: `${clean}-${i}`, adjusted: true }
}

/* ---------- util cloudinary ---------- */
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
  const res = await cloudinary.uploader.destroy(parsed.publicId, {
    resource_type: parsed.resourceType
  })
  return { ok: res?.result === 'ok' || res?.result === 'not found', res }
}

/* ---------- GET: list & detail ---------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (id) {
      const item = await prisma.article.findUnique({ where: { id }, include: { category: true } })
      if (!item) return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })
      return NextResponse.json(item)
    }

    const list = await prisma.article.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(list)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

/* --- POST: create (dengan upsert kategori) --- */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = (form.get('title') as string) ?? ''
    const rawSlug = (form.get('slug') as string) ?? ''
    const categorySlugInput = (form.get('categorySlug') as string) || '' // '' = tanpa kategori
    const content = (form.get('content') as string) || ''
    const published = form.get('published') === 'on'
    const cover = (form.get('cover') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site'

    if (!title || !rawSlug) {
      return NextResponse.json({ error: 'Judul dan slug wajib diisi' }, { status: 400 })
    }

    // upsert kategori bila ada input slug
    let categoryId: string | undefined
    if (categorySlugInput) {
      const cat = await prisma.category.upsert({
        where: { slug: categorySlugInput },
        update: {},
        create: { slug: categorySlugInput, name: humanizeSlug(categorySlugInput) }
      })
      categoryId = cat.id
    }

    const hasNewCover = cover && cover.size > 0
    const coverImageUrl = hasNewCover ? await maybeUploadFile(cover!, folder) : undefined

    const { slug: firstSlug, adjusted: firstAdjusted } = await resolveUniqueSlug(rawSlug)
    const tryCreate = (useSlug: string) =>
      prisma.article.create({
        data: { title, slug: useSlug, content, published, coverImageUrl, categoryId },
        include: { category: true }
      })

    try {
      const created = await tryCreate(firstSlug)
      return NextResponse.json(
        {
          ...created,
          _meta: {
            message: firstAdjusted
              ? `Slug sudah dipakai, diubah menjadi "${firstSlug}".`
              : 'Artikel berhasil disimpan.',
            slugAdjusted: firstAdjusted
          }
        },
        { status: 201 }
      )
    } catch (e: any) {
      if (e?.code === 'P2002' && e?.meta?.target?.includes('slug')) {
        const { slug: retrySlug } = await resolveUniqueSlug(firstSlug)
        const created = await tryCreate(retrySlug)
        return NextResponse.json(
          { ...created, _meta: { message: `Slug sudah dipakai, diubah menjadi "${retrySlug}".`, slugAdjusted: true } },
          { status: 201 }
        )
      }
      return NextResponse.json({ error: 'Gagal menyimpan artikel' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
  }
}

/* ---------- PATCH: toggle publish ---------- */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; published?: boolean }
    if (!body?.id || typeof body.published !== 'boolean') {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }
    const updated = await prisma.article.update({
      where: { id: body.id },
      data: { published: body.published },
      include: { category: true }
    })
    return NextResponse.json({ ...updated, _meta: { message: 'Status terbit diperbarui.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Gagal memperbarui status' }, { status: 500 })
  }
}

/* --- PUT: update (pertahankan cover lama; upsert kategori, kosongkan bila '') --- */
export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const id = (form.get('id') as string) ?? ''
    const title = (form.get('title') as string) ?? ''
    const rawSlug = (form.get('slug') as string) ?? ''
    const categorySlugInput = form.get('categorySlug') as string // undefined = jangan diubah; '' = hapus kategori
    const content = (form.get('content') as string) || ''
    const publishedStr = form.get('published') as string | null
    const cover = (form.get('cover') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site'

    if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!title || !rawSlug) return NextResponse.json({ error: 'Judul dan slug wajib diisi' }, { status: 400 })

    const existing = await prisma.article.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })

    // hitung categoryId perubahan
    let nextCategoryField: { categoryId: string | null } | undefined = undefined
    if (categorySlugInput !== undefined) {
      if (categorySlugInput === '') {
        nextCategoryField = { categoryId: null }
      } else {
        const cat = await prisma.category.upsert({
          where: { slug: categorySlugInput },
          update: {},
          create: { slug: categorySlugInput, name: humanizeSlug(categorySlugInput) }
        })
        nextCategoryField = { categoryId: cat.id }
      }
    }

    const { slug: finalSlug, adjusted } = await resolveUniqueSlug(rawSlug, id)

    const hasNewCover = cover && cover.size > 0
    let coverImageUrl: string | undefined
    if (hasNewCover) {
      if (existing.coverImageUrl) {
        try {
          await destroyCloudinaryByUrl(existing.coverImageUrl)
        } catch {}
      }
      coverImageUrl = await maybeUploadFile(cover!, folder)
    }

    const updated = await prisma.article.update({
      where: { id },
      data: {
        title,
        slug: finalSlug,
        content,
        ...(publishedStr !== null ? { published: publishedStr === 'on' } : {}),
        ...(nextCategoryField ?? {}),
        ...(hasNewCover ? { coverImageUrl } : {})
      },
      include: { category: true }
    })

    return NextResponse.json({
      ...updated,
      _meta: {
        message: adjusted ? `Slug diubah menjadi "${finalSlug}".` : 'Perubahan disimpan.',
        slugAdjusted: adjusted
      }
    })
  } catch (e: any) {
    if (e?.code === 'P2002' && e?.meta?.target?.includes('slug')) {
      return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Gagal menyimpan perubahan' }, { status: 500 })
  }
}

/* ---------- DELETE: hapus artikel + media Cloudinary ---------- */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    const existing = await prisma.article.findUnique({
      where: { id: body.id },
      select: { id: true, coverImageUrl: true }
    })
    if (!existing) return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })

    if (existing.coverImageUrl) {
      try {
        await destroyCloudinaryByUrl(existing.coverImageUrl)
      } catch {}
    }

    await prisma.article.delete({ where: { id: body.id } })

    return NextResponse.json({ ok: true, _meta: { message: 'Artikel dihapus.' } })
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus artikel' }, { status: 500 })
  }
}

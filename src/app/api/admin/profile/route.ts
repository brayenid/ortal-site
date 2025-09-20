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

/* ---- util: parse & destroy Cloudinary ---- */
const parseCloudinaryPublicId = (secureUrl?: string | null) => {
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

/* ---------------- GET (ambil profil tunggal id=1) ---------------- */
export async function GET() {
  try {
    const item = await prisma.officeProfile.findUnique({ where: { id: 1 } })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil profil' }, { status: 500 })
  }
}

/* ---------------- PUT (buat/ubah profil id=1) + audit createdById/updatedById ---------------- */
export async function PUT(req: Request) {
  try {
    const actorId = await getActor()

    const form = await req.formData()
    const name = (form.get('name') as string) ?? ''
    const address = ((form.get('address') as string) ?? '').trim()
    const email = ((form.get('email') as string) ?? '').trim()
    const phone = ((form.get('phone') as string) ?? '').trim()
    const socialStr = (form.get('social') as string) ?? ''
    const description = ((form.get('description') as string) ?? '').trim()
    const logo = (form.get('logo') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site/profile'

    if (!name.trim()) {
      return NextResponse.json({ error: 'Nama kantor wajib diisi' }, { status: 400 })
    }

    let social: any | undefined
    if (socialStr) {
      try {
        social = JSON.parse(socialStr)
      } catch {
        return NextResponse.json({ error: 'Format sosial media harus JSON valid' }, { status: 400 })
      }
    }

    const existing = await prisma.officeProfile.findUnique({ where: { id: 1 } })

    const hasNewLogo = logo && logo.size > 0
    let logoUrl: string | undefined
    if (hasNewLogo) {
      if (existing?.logoUrl) {
        try {
          await destroyCloudinaryByUrl(existing.logoUrl)
        } catch {}
      }
      logoUrl = await maybeUploadFile(logo!, folder)
    }

    const payload = {
      name,
      address: address || undefined,
      email: email || undefined,
      phone: phone || undefined,
      social: social ?? undefined,
      description: description || undefined,
      ...(hasNewLogo ? { logoUrl } : {})
    }

    const saved = await prisma.officeProfile.upsert({
      where: { id: 1 },
      create: { id: 1, ...payload, createdById: actorId, updatedById: actorId },
      update: { ...payload, updatedById: actorId }
    })

    return NextResponse.json({ ...saved, _meta: { message: 'Profil disimpan.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
import { v2 as cloudinary } from 'cloudinary'

/* ---- util: parse & destroy Cloudinary (ikuti pola artikel/pegawai) ---- */
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

/* ---------------- PUT (buat/ubah profil id=1) ---------------- */
export async function PUT(req: Request) {
  try {
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

    // parse social JSON (opsional)
    let social: any | undefined
    if (socialStr) {
      try {
        social = JSON.parse(socialStr)
      } catch {
        return NextResponse.json({ error: 'Format sosial media harus JSON valid' }, { status: 400 })
      }
    }

    const existing = await prisma.officeProfile.findUnique({ where: { id: 1 } })

    // upload logo baru jika ada file baru
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
      update: payload,
      create: { id: 1, ...payload }
    })

    return NextResponse.json({ ...saved, _meta: { message: 'Profil disimpan.' } })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 })
  }
}

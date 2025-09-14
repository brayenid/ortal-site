import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'

export async function GET() {
  const item = await prisma.jumbotron.findUnique({ where: { id: 1 } })
  return NextResponse.json(item)
}

export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const title = (form.get('title') as string) ?? ''
    const subtitle = (form.get('subtitle') as string) ?? ''
    const image = (form.get('image') as File) ?? null
    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site/jumbotron'

    const existing = await prisma.jumbotron.findUnique({ where: { id: 1 } })

    const hasNewImage = image && image.size > 0
    const imageUrl = hasNewImage ? await maybeUploadFile(image!, folder) : undefined

    const saved = await prisma.jumbotron.upsert({
      where: { id: 1 },
      create: { id: 1, title, subtitle, imageUrl: imageUrl ?? existing?.imageUrl },
      update: {
        title,
        subtitle,
        ...(hasNewImage ? { imageUrl } : {}) // ⬅️ pertahankan gambar lama kalau tidak upload baru
      }
    })

    return NextResponse.json({ ...saved, _meta: { message: 'Jumbotron disimpan.' } })
  } catch (e) {
    return NextResponse.json({ error: 'Gagal menyimpan jumbotron' }, { status: 500 })
  }
}

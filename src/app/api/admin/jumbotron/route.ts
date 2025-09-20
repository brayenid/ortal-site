import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maybeUploadFile } from '@/app/api/_helpers'
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

/** GET */
export async function GET() {
  const item = await prisma.jumbotron.findUnique({ where: { id: 1 } })
  return NextResponse.json(item)
}

/** PUT (create/update) + audit createdById/updatedById */
export async function PUT(req: Request) {
  try {
    const actorId = await getActor()

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
      create: {
        id: 1,
        title,
        subtitle,
        imageUrl: imageUrl ?? existing?.imageUrl,
        createdById: actorId,
        updatedById: actorId
      },
      update: {
        title,
        subtitle,
        ...(hasNewImage ? { imageUrl } : {}),
        updatedById: actorId
      }
    })

    return NextResponse.json({ ...saved, _meta: { message: 'Jumbotron disimpan.' } })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Gagal menyimpan jumbotron' }, { status: 500 })
  }
}

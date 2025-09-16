// src/app/api/admin/upload/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'

export const runtime = 'nodejs' as const

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
})

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

const assertCanUpload = async () => {
  const session = await getServerSession(authConfig)
  const role = session?.user?.role as 'ADMIN' | 'EDITOR' | 'USER' | undefined
  if (!session || !role || (role !== 'ADMIN' && role !== 'EDITOR')) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

export const POST = async (req: NextRequest): Promise<Response> => {
  try {
    await assertCanUpload()

    const form = await req.formData()
    const file = form.get('file') as File | null
    const folder = (form.get('folder') as string | null) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site'

    if (!file) return err('file is required', 400)

    const ab = await file.arrayBuffer()
    const buffer = Buffer.from(ab)

    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) =>
        error || !result ? reject(error) : resolve(result!)
      )
      stream.end(buffer)
    })

    return NextResponse.json({
      url: uploadResult.secure_url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      public_id: uploadResult.public_id
    })
  } catch (e: any) {
    if (e instanceof Response) return e
    return err(e?.message || 'upload failed', 500)
  }
}

export const DELETE = async (req: NextRequest): Promise<Response> => {
  try {
    await assertCanUpload()
    const { public_id } = await req.json()
    if (!public_id || typeof public_id !== 'string') return err('public_id is required', 400)

    const res = await cloudinary.uploader.destroy(public_id)
    // res.result: 'ok' | 'not found' | 'error' | ...
    if (res.result !== 'ok' && res.result !== 'not found') {
      return err(`cloudinary delete failed: ${res.result ?? 'unknown'}`, 500)
    }
    return NextResponse.json({ ok: true, result: res.result })
  } catch (e: any) {
    if (e instanceof Response) return e
    return err(e?.message || 'delete failed', 500)
  }
}

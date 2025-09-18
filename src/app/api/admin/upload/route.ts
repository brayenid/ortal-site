import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

/** WAJIB Node.js runtime (cloudinary butuh Node) */
export const runtime = 'nodejs'
/** Biar formData() tidak di-ISR/cache */
export const dynamic = 'force-dynamic'

/** ---- Cloudinary config dari env ---- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
})

/** ---- Guard: hanya role tertentu yang boleh upload/delete ---- */
async function assertCanUpload() {
  const session = await getServerSession(authConfig)
  // sesuaikan aksesnya: ADMIN/EDITOR dsb
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    // bisa juga cek email tertentu kalau kamu belum pakai role
    // if (!['you@example.com'].includes(session?.user?.email ?? '')) throw ...
    throw new Response('Unauthorized', { status: 401 })
  }
}

/** helper upload buffer via stream */
function uploadBuffer(buffer: Buffer, folder?: string, tags?: string[]) {
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, tags }, (err, result) =>
      err || !result ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })
}

/** POST: upload image */
export async function POST(req: NextRequest) {
  try {
    await assertCanUpload()

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const folder = (form.get('folder') as string) || process.env.CLOUDINARY_UPLOAD_FOLDER || 'office-site'

    const ab = await file.arrayBuffer()
    const buffer = Buffer.from(ab)

    const up = await uploadBuffer(buffer, folder, ['wysiwyg', 'office-site'])

    return NextResponse.json({
      url: up.secure_url,
      public_id: up.public_id,
      width: up.width,
      height: up.height,
      bytes: up.bytes,
      format: up.format
    })
  } catch (e: any) {
    if (e instanceof Response) return e // dari assertCanUpload()
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

/** DELETE: hapus image (body: { public_id }) */
export async function DELETE(req: NextRequest) {
  try {
    await assertCanUpload()

    const { public_id } = await req.json()
    if (!public_id) {
      return NextResponse.json({ error: 'public_id is required' }, { status: 400 })
    }

    const res = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'image',
      invalidate: true
    })

    // Cloudinary bisa balikin 'ok' atau 'not found'
    if (res.result !== 'ok' && res.result !== 'not found') {
      return NextResponse.json({ error: 'Cloudinary delete failed', result: res }, { status: 500 })
    }

    return NextResponse.json({ ok: true, result: res.result })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Ambil ID video dari berbagai bentuk URL YouTube (watch, youtu.be, shorts, embed) atau langsung ID */
const YT_ID = /^[A-Za-z0-9_-]{11}$/
function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null

  // kalau langsung ID 11 char
  if (YT_ID.test(raw)) return raw

  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      // https://youtu.be/<id>
      const id = u.pathname.split('/').filter(Boolean)[0]
      return YT_ID.test(id ?? '') ? id! : null
    }
    if (host.endsWith('youtube.com')) {
      // https://youtube.com/watch?v=<id>
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v') ?? ''
        return YT_ID.test(id) ? id : null
      }
      // https://youtube.com/shorts/<id> atau /embed/<id>
      const parts = u.pathname.split('/').filter(Boolean)
      const maybeId = parts[1] ?? '' // ['shorts','<id>'] atau ['embed','<id>']
      return YT_ID.test(maybeId) ? maybeId : null
    }
    return null
  } catch {
    return null
  }
}

const canonUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
const thumbUrl = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`

/* -------- GET: list -------- */
export async function GET() {
  try {
    const items = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

/* -------- POST: create -------- */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = (form.get('title') as string) ?? ''
    const urlInput = (form.get('youtubeUrl') as string) ?? ''
    const description = ((form.get('description') as string) ?? '').trim() || null

    if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })

    const id = parseYouTubeId(urlInput)
    if (!id) return NextResponse.json({ error: 'URL/ID YouTube tidak valid' }, { status: 400 })

    const created = await prisma.video.create({
      data: {
        title,
        url: canonUrl(id),
        thumbnailUrl: thumbUrl(id),
        description
      }
    })

    return NextResponse.json({ ...created, _meta: { message: 'Video disimpan.' } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan video' }, { status: 500 })
  }
}

/* -------- PUT: update -------- */
export async function PUT(req: Request) {
  try {
    const form = await req.formData()
    const idDb = (form.get('id') as string) ?? ''
    const title = (form.get('title') as string) ?? ''
    const urlInput = (form.get('youtubeUrl') as string) ?? '' // boleh kosong = tidak ganti
    const description = ((form.get('description') as string) ?? '').trim() || null

    if (!idDb) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })

    // siapkan update data
    const data: any = { title, description }

    if (urlInput.trim()) {
      const yid = parseYouTubeId(urlInput)
      if (!yid) return NextResponse.json({ error: 'URL/ID YouTube tidak valid' }, { status: 400 })
      data.url = canonUrl(yid)
      data.thumbnailUrl = thumbUrl(yid)
    }

    const updated = await prisma.video.update({ where: { id: idDb }, data })
    return NextResponse.json({ ...updated, _meta: { message: 'Perubahan disimpan.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Video tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal menyimpan perubahan' }, { status: 500 })
  }
}

/* -------- DELETE: delete -------- */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { id?: string }
    if (!body?.id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

    await prisma.video.delete({ where: { id: body.id } })
    return NextResponse.json({ ok: true, _meta: { message: 'Video dihapus.' } })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Video tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ error: 'Gagal menghapus video' }, { status: 500 })
  }
}

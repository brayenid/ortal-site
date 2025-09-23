// src/app/api/admin/comments/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FORUM = process.env.DISQUS_FORUM
const API_SECRET = process.env.DISQUS_API_SECRET

async function assertCanManage() {
  const session = await getServerSession(authConfig)
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

type DisqusPost = {
  id: string
  message: string
  createdAt: string
  isApproved: boolean
  isSpam: boolean
  isDeleted: boolean
  author?: {
    id?: string
    name?: string
    username?: string
    profileUrl?: string
    avatar?: { permalink?: string; cache?: string }
  }
  thread?: {
    id?: string
    title?: string
    link?: string
    forum?: string
  }
}

export async function GET(req: Request) {
  try {
    await assertCanManage()

    if (!FORUM || !API_SECRET) {
      return NextResponse.json(
        { error: 'DISQUS_FORUM / DISQUS_API_SECRET belum di-set di environment.' },
        { status: 501 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const cursor = searchParams.get('cursor') || ''

    const qs = new URLSearchParams({
      forum: FORUM,
      order: 'desc',
      limit: String(limit),
      api_secret: API_SECRET
    })
    if (cursor) qs.set('cursor', cursor)
    qs.append('related', 'thread')

    const url = `https://disqus.com/api/3.0/posts/list.json?${qs.toString()}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()

    if (!res.ok || !json?.response) {
      const msg = json?.response || json?.error || 'Gagal mengambil komentar'
      return NextResponse.json({ error: String(msg) }, { status: 502 })
    }

    const items: DisqusPost[] = (json.response as any[]).map((p) => ({
      id: String(p.id),
      message: String(p.message || ''),
      createdAt: p.createdAt || p.created_at || p.created || '',
      isApproved: !!p.isApproved,
      isSpam: !!p.isSpam,
      isDeleted: !!p.isDeleted,
      // author TIDAK perlu di-related: sudah ada di response post
      author: {
        id: p.author?.id ? String(p.author.id) : undefined,
        name: p.author?.name,
        username: p.author?.username,
        profileUrl: p.author?.profileUrl,
        avatar: {
          permalink: p.author?.avatar?.permalink,
          cache: p.author?.avatar?.cache
        }
      },
      // thread DIDAPAT dari related=thread
      thread: {
        id: p.thread?.id ? String(p.thread.id) : undefined,
        title: p.thread?.title,
        link: p.thread?.link,
        forum: p.thread?.forum
      }
    }))

    const cursorNext = json?.cursor?.next || ''
    const hasNext = Boolean(json?.cursor?.hasNext)

    return NextResponse.json({ ok: true, items, cursor: cursorNext, hasNext })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Fetch failed' }, { status: 500 })
  }
}

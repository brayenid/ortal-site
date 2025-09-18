import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { linksArraySchema } from '@/lib/links-schema'
import type { $Enums, IconKind } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const assertCanManage = async () => {
  const session = await getServerSession(authConfig)
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

/** GET /api/admin/links -> { ok: true, items: Link[] } */
export async function GET() {
  try {
    const items = await prisma.link.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        label: true,
        url: true,
        newTab: true,
        order: true,
        iconKind: true,
        iconName: true,
        iconSvg: true,
        description: true
      }
    })

    // Pastikan nullability dan tipe konsisten dengan client
    const rows = items.map((x) => ({
      id: String(x.id),
      label: x.label ?? '',
      url: x.url ?? '',
      newTab: !!x.newTab,
      order: Number(x.order ?? 0),
      iconKind: (x.iconKind ?? null) as IconKind | null,
      iconName: x.iconName ?? null,
      iconSvg: x.iconSvg ?? null,
      description: x.description ?? null
    }))

    return NextResponse.json({ ok: true, items: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fetch failed' }, { status: 500 })
  }
}

/** PUT /api/admin/links -> { ok: true, items: Link[] } */
export async function PUT(req: NextRequest) {
  try {
    await assertCanManage()

    const body = await req.json().catch(() => ({}))
    const parsed = linksArraySchema.safeParse(body?.items ?? body?.links ?? body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    // Ambil id-id lama untuk kebutuhan delete
    const existing = await prisma.link.findMany({ select: { id: true } })
    const existingIds = new Set(existing.map((x) => x.id))
    const incomingIds = new Set<string>(input.map((x) => String(x.id || '')))

    const result = await prisma.$transaction(async (tx) => {
      // Upsert + set order sesuai index
      const upserted: {
        id: string
        label: string
        url: string
        newTab: boolean
        order: number
        description: string | null
        iconKind: $Enums.IconKind | null
        iconName: string | null
        iconSvg: string | null
      }[] = []
      for (let i = 0; i < input.length; i++) {
        const v = input[i]
        const data = {
          label: v.label,
          url: v.url,
          newTab: v.newTab ?? true,
          order: i,
          iconKind: (v.iconKind ?? null) as IconKind | null,
          iconName: v.iconName ?? null,
          iconSvg: v.iconSvg ?? null,
          description: v.description ?? null
        }

        if (v.id && existingIds.has(String(v.id))) {
          upserted.push(
            await tx.link.update({
              where: { id: String(v.id) },
              data,
              select: {
                id: true,
                label: true,
                url: true,
                newTab: true,
                order: true,
                iconKind: true,
                iconName: true,
                iconSvg: true,
                description: true
              }
            })
          )
        } else {
          upserted.push(
            await tx.link.create({
              data,
              select: {
                id: true,
                label: true,
                url: true,
                newTab: true,
                order: true,
                iconKind: true,
                iconName: true,
                iconSvg: true,
                description: true
              }
            })
          )
        }
      }

      // Hapus record yang tidak ada di payload
      const toDelete = [...existingIds].filter((id) => id && !incomingIds.has(id))
      if (toDelete.length) {
        await tx.link.deleteMany({ where: { id: { in: toDelete } } })
      }

      // Return terurut
      return upserted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    })

    const rows = result.map((x) => ({
      id: String(x.id),
      label: x.label ?? '',
      url: x.url ?? '',
      newTab: !!x.newTab,
      order: Number(x.order ?? 0),
      iconKind: (x.iconKind ?? null) as IconKind | null,
      iconName: x.iconName ?? null,
      iconSvg: x.iconSvg ?? null,
      description: x.description ?? null
    }))

    return NextResponse.json({ ok: true, items: rows })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}

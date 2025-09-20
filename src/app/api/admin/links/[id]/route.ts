import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { linkItemSchema } from '@/lib/links-schema'
import type { IconKind } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const assertCanManage = async (): Promise<string> => {
  const session = await getServerSession(authConfig)
  const role = (session as any)?.user?.role as string | undefined
  if (!session || !['ADMIN', 'EDITOR'].includes(role || '')) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return (session as any).user.id as string
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await assertCanManage()
    const id = String((await params).id)

    const body = await req.json().catch(() => ({}))
    const parsed = linkItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const v = parsed.data

    const updated = await prisma.link.update({
      where: { id },
      data: {
        ...(v.label !== undefined ? { label: v.label } : {}),
        ...(v.url !== undefined ? { url: v.url } : {}),
        ...(v.newTab !== undefined ? { newTab: v.newTab } : {}),
        ...(v.order !== undefined ? { order: v.order } : {}),
        ...(v.iconKind !== undefined ? { iconKind: (v.iconKind ?? null) as IconKind | null } : {}),
        ...(v.iconName !== undefined ? { iconName: v.iconName ?? null } : {}),
        ...(v.iconSvg !== undefined ? { iconSvg: v.iconSvg ?? null } : {}),
        ...(v.description !== undefined ? { description: v.description ?? null } : {}),
        updatedById: actorId
      },
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

    return NextResponse.json({ ok: true, item: updated })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCanManage()
    await prisma.link.delete({ where: { id: String((await params).id) } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}

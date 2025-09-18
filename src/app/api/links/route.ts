// src/app/api/links/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await prisma.link.findMany({
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
  return NextResponse.json({ items: rows })
}

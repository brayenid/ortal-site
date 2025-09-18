import type { IconKind } from '@prisma/client'

export type LinkRow = {
  id: string
  label: string
  url: string
  newTab: boolean
  order: number
  description: string | null
  iconKind?: IconKind | null
  iconName?: string | null
  iconSvg?: string | null
}

/** Buat baris baru (default) */
export const makeNewLink = (): LinkRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  url: '',
  newTab: true,
  order: 0,
  description: ' ',
  iconKind: null,
  iconName: null,
  iconSvg: null
})

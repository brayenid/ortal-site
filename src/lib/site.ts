import { prisma } from '@/lib/prisma'

export interface Office {
  name: string
  address?: string | null
  email?: string | null
  phone?: string | null
  social?: Record<string, any> | null
  logoUrl?: string | null
  description?: string | null
}

export interface Jumbotron {
  title: string
  subtitle: string
  imageUrl: string
}

export async function getOffice(): Promise<Office | null> {
  try {
    const p = await prisma.officeProfile.findUnique({
      where: { id: 1 },
      select: {
        name: true,
        address: true,
        logoUrl: true,
        social: true
      }
    })
    if (!p) return null
    return {
      name: p.name,
      address: p.address ?? undefined,
      logoUrl: p.logoUrl ?? undefined,
      social: p.social as any[] | undefined
    }
  } catch {
    return {
      name: 'Bagian Ortal',
      address: 'Jl. Komplek Perkantoran Kabupaten Kutai Barat',
      logoUrl: '/'
    }
  }
}

export async function getJumbotron(): Promise<Jumbotron> {
  try {
    const p = await prisma.jumbotron.findUnique({
      where: { id: 1 },
      select: {
        title: true,
        subtitle: true,
        imageUrl: true
      }
    })
    if (!p) {
      return {
        title: 'Bagian Ortal',
        subtitle: 'Jl. Komplek Perkantoran Kabupaten Kutai Barat',
        imageUrl: '/'
      }
    }
    return {
      title: p.title ?? '',
      subtitle: p.subtitle ?? '',
      imageUrl: p.imageUrl ?? ''
    }
  } catch {
    return {
      title: 'Bagian Ortal',
      subtitle: 'Jl. Komplek Perkantoran Kabupaten Kutai Barat',
      imageUrl: '/'
    }
  }
}

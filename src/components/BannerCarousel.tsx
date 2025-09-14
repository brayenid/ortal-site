import { prisma } from '@/lib/prisma'
import ClientBannerCarousel from './ClientBannerCarousel'

export async function BannerCarousel() {
  const banners = await prisma.banner.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, title: true, description: true, linkUrl: true, imageUrl: true }
  })
  if (!banners.length) return null
  return <ClientBannerCarousel banners={banners} />
}

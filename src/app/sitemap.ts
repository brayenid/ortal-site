import type { MetadataRoute } from 'next'

export const revalidate = 3600 // <- wajib literal, bukan 60*60

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://organisasikubar.netlify.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/profil`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/artikel`, changeFrequency: 'daily', priority: 0.8 }
  ]
}

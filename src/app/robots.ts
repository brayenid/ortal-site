import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://organisasikubar.netlify.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // admin & API
          '/admin',
          '/api/',
          '/api/*',
          // auth & util
          '/login',
          '/register',
          '/_next/',
          '/static/'
        ]
      },
      // contoh memblokir bot nakal (opsional)
      { userAgent: 'AiCrawler', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' }
    ],
    sitemap: [`${BASE}/sitemap.xml`],
    host: BASE
  }
}

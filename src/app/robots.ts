// src/app/robots.ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

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
    sitemap: [`${BASE_URL}/sitemap.xml`],
    host: BASE_URL
  }
}

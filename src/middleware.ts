// middleware.ts
import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ---- Tipe role sesuai schema mu
type Role = 'ADMIN' | 'EDITOR' | 'USER'

// ---- Daftar aturan akses (regex -> peran yang diizinkan)
const ACL: Array<{ matcher: RegExp; roles: Role[] }> = [
  // Admin Users: hanya ADMIN
  { matcher: /^\/admin\/users(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/api\/admin\/users(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/admin\/employees(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/admin\/faq(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/admin\/profile(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/admin\/links(?:\/.*)?$/, roles: ['ADMIN'] },
  { matcher: /^\/admin\/banners(?:\/.*)?$/, roles: ['ADMIN'] },

  // Konten: ADMIN & EDITOR
  { matcher: /^\/admin\/category(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/admin\/artikel(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/admin\/videos(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/admin(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] }, // dashboard umum

  // API konten
  { matcher: /^\/api\/admin\/links(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/category(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/artikel(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/employees(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/videos(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/faq(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] },
  { matcher: /^\/api\/admin\/profile(?:\/.*)?$/, roles: ['ADMIN', 'EDITOR'] }
]

// ---- Helper: cari aturan berdasarkan pathname
function findRule(pathname: string) {
  return ACL.find((r) => r.matcher.test(pathname))
}

// ---- Helper: response JSON untuk API
function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Lewatkan HEAD/OPTIONS agar CORS/preflight aman
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return NextResponse.next()
  }

  // Abaikan file statis & internal next
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt)$/)
  ) {
    return NextResponse.next()
  }

  // Hanya jalankan guard bila match ACL
  const rule = findRule(pathname)
  if (!rule) return NextResponse.next()

  // Ambil token NextAuth (perlu NEXTAUTH_SECRET)
  const token = await getToken({ req })
  const role = (token?.role as Role | undefined) ?? undefined
  const isApi = pathname.startsWith('/api/')

  // Belum login
  if (!token) {
    if (isApi) {
      return json(401, { error: 'Unauthorized' })
    }
    // redirect ke login dengan callback kembali ke URL ini
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.href)
    loginUrl.searchParams.set('error', 'AccessDenied')
    return NextResponse.redirect(loginUrl)
  }

  // Sudah login tapi role tidak cukup
  if (!role || !rule.roles.includes(role)) {
    if (isApi) {
      return json(403, { error: 'Forbidden' })
    }
    const deniedUrl = req.nextUrl.clone()
    deniedUrl.pathname = '/login'
    deniedUrl.searchParams.set('error', 'AccessDenied')
    return NextResponse.redirect(deniedUrl)
  }

  // Lolos
  return NextResponse.next()
}

// ---- Batasi ruang lingkup middleware
export const config = {
  matcher: [
    // Halaman admin
    '/admin/:path*',
    // API admin
    '/api/admin/:path*'
  ]
}

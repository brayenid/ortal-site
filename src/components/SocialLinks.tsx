import { getOffice } from '@/lib/site'
import Link from 'next/link'
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Github, Globe, Send, MessageCircle, Mail } from 'lucide-react'
import type { ReactNode } from 'react'

type Item = { key: string; label: string; href: string; icon: ReactNode }
type Scheme = 'light' | 'dark'
type Size = 'sm' | 'md' | 'lg'

/** Normalisasi input -> URL final */
function buildUrl(platform: string, raw: string): string | null {
  const v = (raw || '').trim()
  if (!v) return null
  const isUrl = /^https?:\/\//i.test(v)

  switch (platform) {
    case 'instagram': {
      if (isUrl) return v
      const handle = v.replace(/^@/, '')
      return `https://instagram.com/${handle}`
    }
    case 'facebook': {
      if (isUrl) return v
      return `https://facebook.com/${v.replace(/^@/, '')}`
    }
    case 'twitter':
    case 'x': {
      if (isUrl) return v
      return `https://twitter.com/${v.replace(/^@/, '')}`
    }
    case 'youtube': {
      if (isUrl) return v
      // coba pakai @handle, fallback ke /c/
      const handle = v.replace(/^@?/, '@')
      return `https://youtube.com/${handle}`
    }
    case 'tiktok': {
      if (isUrl) return v
      return `https://tiktok.com/@${v.replace(/^@/, '')}`
    }
    case 'linkedin': {
      if (isUrl) return v
      return `https://www.linkedin.com/${v}`
    }
    case 'telegram': {
      if (isUrl) return v
      return `https://t.me/${v.replace(/^@/, '')}`
    }
    case 'whatsapp': {
      if (isUrl) return v
      const digits = v.replace(/[^\d]/g, '')
      if (!digits) return null
      return `https://wa.me/${digits}`
    }
    case 'website':
    case 'site': {
      return isUrl ? v : `https://${v}`
    }
    case 'email': {
      // boleh "mailto:" langsung atau alamat email
      return v.startsWith('mailto:') ? v : `mailto:${v}`
    }
    default:
      return isUrl ? v : null
  }
}

const PLATFORM_META: Record<string, { label: string; keys: string[]; icon: ReactNode }> = {
  website: { label: 'Website', keys: ['website', 'site', 'web'], icon: <Globe className="h-4 w-4" /> },
  email: { label: 'Email', keys: ['email'], icon: <Mail className="h-4 w-4" /> },
  instagram: { label: 'Instagram', keys: ['instagram', 'ig'], icon: <Instagram className="h-4 w-4" /> },
  facebook: { label: 'Facebook', keys: ['facebook', 'fb'], icon: <Facebook className="h-4 w-4" /> },
  twitter: { label: 'Twitter', keys: ['twitter', 'x'], icon: <Twitter className="h-4 w-4" /> },
  youtube: { label: 'YouTube', keys: ['youtube', 'yt'], icon: <Youtube className="h-4 w-4" /> },
  linkedin: { label: 'LinkedIn', keys: ['linkedin'], icon: <Linkedin className="h-4 w-4" /> },
  telegram: { label: 'Telegram', keys: ['telegram', 'tg'], icon: <Send className="h-4 w-4" /> },
  whatsapp: { label: 'WhatsApp', keys: ['whatsapp', 'wa'], icon: <MessageCircle className="h-4 w-4" /> },
  github: { label: 'GitHub', keys: ['github'], icon: <Github className="h-4 w-4" /> }
}

/** Ubah JSON sosial -> daftar item siap render */
function toItems(social: Record<string, any> | null | undefined): Item[] {
  if (!social || typeof social !== 'object') return []
  const entries = Object.entries(social)

  const items: Item[] = []
  for (const [rawKey, rawVal] of entries) {
    const key = rawKey.toLowerCase()
    const value = typeof rawVal === 'string' ? rawVal : rawVal?.url || rawVal?.handle || ''
    if (!value) continue

    for (const [pName, meta] of Object.entries(PLATFORM_META)) {
      if (!meta.keys.includes(key)) continue
      const href = buildUrl(key, value)
      if (!href) continue
      items.push({ key: pName, label: meta.label, href, icon: meta.icon })
      break
    }
  }
  // urutkan sedikit (website, email dulu)
  const order = ['website', 'email']
  return items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}

const sizeCls: Record<Size, string> = {
  sm: 'h-8 w-8 text-[0.9rem]',
  md: 'h-9 w-9 text-[1rem]',
  lg: 'h-10 w-10 text-[1.05rem]'
}

const schemeCls = (scheme: Scheme) =>
  scheme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

type Props = {
  className?: string
  scheme?: Scheme // default 'light'
  size?: Size // default 'md'
  showLabels?: boolean // kalau mau tampilkan teks di samping ikon
}

/**
 * Server Component – ambil social dari OfficeProfile lewat getOffice().
 * Render icon buttons; otomatis skip yang kosong.
 */
export default async function SocialLinks({
  className = '',
  scheme = 'light',
  size = 'md',
  showLabels = false
}: Props) {
  const office = await getOffice()
  const social = office?.social as Record<string, any> | undefined
  const items = toItems(social)

  if (!items.length) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          target={it.href.startsWith('mailto:') ? undefined : '_blank'}
          rel={it.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          aria-label={it.label}
          className={`inline-flex items-center justify-center rounded-full transition-colors ${
            sizeCls[size]
          } ${schemeCls(scheme)} ${showLabels ? 'px-3 gap-2 rounded-xl' : ''}`}>
          {it.icon}
          {showLabels && <span className={scheme === 'dark' ? 'text-white' : 'text-slate-800'}>{it.label}</span>}
        </Link>
      ))}
    </div>
  )
}

/** Versi client-friendly (opsional) kalau mau dipakai dengan data custom */
export function SocialLinksInline({ social, ...rest }: { social: Record<string, any> } & Props) {
  const items = toItems(social)
  if (!items.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 ${rest.className ?? ''}`}>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          target={it.href.startsWith('mailto:') ? undefined : '_blank'}
          rel={it.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
          aria-label={it.label}
          className={`inline-flex items-center justify-center rounded-full transition-colors ${
            sizeCls[rest.size ?? 'md']
          } ${schemeCls(rest.scheme ?? 'light')} ${rest.showLabels ? 'px-3 gap-2 rounded-xl' : ''}`}>
          {it.icon}
          {rest.showLabels && (
            <span className={rest.scheme === 'dark' ? 'text-white' : 'text-slate-800'}>{it.label}</span>
          )}
        </Link>
      ))}
    </div>
  )
}

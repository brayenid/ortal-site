// links-schema.ts
import { z } from 'zod'

const urlRegex = /^(https?:\/\/|mailto:|tel:)/i

export const linkItemSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(1, 'Label wajib'),
    url: z.string().regex(urlRegex, 'URL harus http(s)://, mailto:, atau tel:'),
    newTab: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),

    iconKind: z.enum(['LUCIDE', 'SVG']).nullable().optional(),
    iconName: z.string().nullable().optional(),
    iconSvg: z.string().nullable().optional(),

    description: z.string().nullable().optional()
  })
  .superRefine((v, ctx) => {
    // Aturan ikon:
    // - LUCIDE: wajib iconName, iconSvg harus kosong
    // - SVG: wajib iconSvg, iconName harus kosong
    // - null/undefined: keduanya kosong
    if (v.iconKind === 'LUCIDE') {
      if (!v.iconName) ctx.addIssue({ code: 'custom', path: ['iconName'], message: 'iconName wajib saat LUCIDE' })
      if (v.iconSvg) ctx.addIssue({ code: 'custom', path: ['iconSvg'], message: 'iconSvg harus kosong saat LUCIDE' })
    } else if (v.iconKind === 'SVG') {
      if (!v.iconSvg) ctx.addIssue({ code: 'custom', path: ['iconSvg'], message: 'iconSvg wajib saat SVG' })
      if (v.iconName) ctx.addIssue({ code: 'custom', path: ['iconName'], message: 'iconName harus kosong saat SVG' })
    } else {
      if (v.iconName) ctx.addIssue({ code: 'custom', path: ['iconName'], message: 'iconName harus kosong' })
      if (v.iconSvg) ctx.addIssue({ code: 'custom', path: ['iconSvg'], message: 'iconSvg harus kosong' })
    }
  })

export const linksArraySchema = z.array(linkItemSchema).max(500)
export type LinkItemInput = z.infer<typeof linkItemSchema>
export type LinksArrayInput = z.infer<typeof linksArraySchema>

'use client'

import { DiscussionEmbed } from 'disqus-react'

type Props = {
  identifier: string // pakai article.id atau slug (konsisten!)
  title: string
  url: string // URL publik/kanonik penuh
  language?: string // default: 'id'
}

export default function DisqusThread({ identifier, title, url, language = 'id' }: Props) {
  const shortname = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || 'bagian-organisasi-kubar'

  return <DiscussionEmbed shortname={shortname} config={{ url, identifier, title, language }} />
}

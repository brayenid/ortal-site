'use client'

import { useEffect } from 'react'

type Props = { title?: string; description?: string }

export const ClientPageMeta = ({ title, description }: Props) => {
  useEffect(() => {
    if (title) document.title = title

    if (description) {
      let el = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.name = 'description'
        document.head.appendChild(el)
      }
      el.content = description
    }
  }, [title, description])

  return null
}

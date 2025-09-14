'use client'

import Link from 'next/link'

type Props = {
  href?: string
  label?: string
}

const SkipToArticles = ({ href = '#main', label = 'Lewati ke daftar artikel' }: Props) => {
  return (
    <div className="fixed top-5 left-10 z-[100]">
      <Link href={href} className="skip-link">
        {label}
      </Link>
    </div>
  )
}

export default SkipToArticles

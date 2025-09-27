'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

type Variant = 'on-light' | 'on-dark'

export function SignInOutButton({ variant = 'on-light' }: { variant?: Variant }) {
  const { data, status } = useSession() // 'loading' | 'authenticated' | 'unauthenticated'
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = variant === 'on-dark'
  const cls = isDark
    ? 'btn border border-white/30 !bg-white/10 !text-white hover:!bg-white/20 !rounded !font-normal'
    : 'btn !bg-gray-50 border !text-gray-700 hover:!bg-gray-200 !rounded !font-normal'

  if (!mounted || status === 'loading') {
    return (
      <button className={cls + ' pointer-events-none opacity-70'} aria-busy="true" aria-disabled="true" type="button">
        Memuat…
      </button>
    )
  }

  if (data?.user) {
    return (
      <button className={cls} onClick={() => signOut({ callbackUrl: '/' })} type="button">
        Keluar
      </button>
    )
  }

  return (
    <button className={cls} onClick={() => signIn()} type="button">
      Masuk
    </button>
  )
}

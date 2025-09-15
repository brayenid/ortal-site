'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

type Variant = 'on-light' | 'on-dark'

export function SignInOutButton({ variant = 'on-light' }: { variant?: Variant }) {
  const { data } = useSession()
  const isDark = variant === 'on-dark'
  const cls = isDark
    ? 'btn border border-white/30 !bg-white/10 !text-white hover:!bg-white/20 !rounded !font-normal'
    : 'btn !bg-gray-50 border !text-gray-700 hover:!bg-gray-200 !rounded !font-normal'

  // Signed-in → “Keluar”
  if (data?.user) {
    return (
      <button className={`${cls}`} onClick={() => signOut({ callbackUrl: '/' })}>
        Keluar
      </button>
    )
  }

  // Signed-out → “Masuk”gunakan gaya default (primer) di mode terang
  return (
    <button className={cls} onClick={() => signIn()}>
      Masuk
    </button>
  )
}

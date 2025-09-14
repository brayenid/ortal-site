'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

type Variant = 'on-light' | 'on-dark'

export function SignInOutButton({ variant = 'on-light' }: { variant?: Variant }) {
  const { data } = useSession()
  const isDark = variant === 'on-dark'

  // Signed-in → “Keluar”
  if (data?.user) {
    const cls = isDark
      ? 'btn border border-white/30 !bg-white/10 !text-white hover:!bg-white/20'
      : 'btn !bg-gray-50 border !text-gray-700 hover:!bg-gray-200'
    return (
      <button className={`${cls} !rounded !font-normal`} onClick={() => signOut({ callbackUrl: '/' })}>
        Keluar
      </button>
    )
  }

  // Signed-out → “Masuk”
  const cls = isDark ? 'btn !bg-white !text-slate-900 hover:!bg-slate-100' : 'btn' // gunakan gaya default (primer) di mode terang
  return (
    <button className={cls} onClick={() => signIn()}>
      Masuk
    </button>
  )
}

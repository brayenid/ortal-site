'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export function SignInOutButton() {
  const { data } = useSession()
  if (data?.user) {
    return (
      <button
        className="btn !bg-gray-50 border !text-gray-600 !font-thin hover:!bg-gray-200"
        onClick={() => signOut({ callbackUrl: '/' })}>
        Keluar
      </button>
    )
  }
  return (
    <button className="btn" onClick={() => signIn()}>
      Masuk
    </button>
  )
}

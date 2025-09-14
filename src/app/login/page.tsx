'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>()

  // Map error code NextAuth -> pesan ramah
  const mapError = (code?: string): string => {
    switch (code) {
      case 'CredentialsSignin':
      case 'CredentialsSigninError':
        return 'Email atau password salah.'
      case 'AccessDenied':
        return 'Akses ditolak.'
      case 'OAuthAccountNotLinked':
        return 'Email ini sudah terdaftar dengan metode login lain.'
      default:
        return 'Gagal masuk. Coba lagi.'
    }
  }

  // Kalau ada ?error= di URL (mis. dari guard lain), tampilkan juga
  useEffect(() => {
    const urlErr = sp.get('error')
    if (urlErr) setError(mapError(urlErr))
  }, [sp])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(undefined)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false // ⬅️ penting: biar kita yang handle
      })

      if (!res) {
        setError('Tidak dapat menghubungi server otentikasi.')
        return
      }
      if (res.error) {
        setError(mapError(res.error))
        return
      }

      // sukses
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Masuk</h1>

      <form onSubmit={onSubmit} className="card space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type={'email'}
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border-slate-300"
            placeholder="Masukan email"
          />
        </div>

        <div>
          <label className="block text-sm mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border-slate-300"
            placeholder="Masukan password"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </div>
      </form>
    </div>
  )
}

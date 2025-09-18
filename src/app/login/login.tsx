'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReCAPTCHA from 'react-google-recaptcha'

const HERO_URL = '/login-img.png'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // reCAPTCHA
  const captchaRef = useRef<ReCAPTCHA>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0) // force remount

  const mapError = (code?: string): string => {
    switch (code) {
      case 'CredentialsSignin':
      case 'CredentialsSigninError':
        return 'Email atau password salah.'
      case 'RecaptchaFailed':
        return 'Verifikasi reCAPTCHA gagal. Coba lagi.'
      case 'AccessDenied':
        return 'Akses ditolak.'
      case 'OAuthAccountNotLinked':
        return 'Email ini sudah terdaftar dengan metode login lain.'
      default:
        return 'Terjadi kesalahan. Coba lagi.'
    }
  }

  useEffect(() => {
    const urlErr = sp.get('error')
    if (urlErr) setError(mapError(urlErr))
  }, [sp])

  const resetCaptcha = () => {
    // reset token + visual checkmark
    try {
      captchaRef.current?.reset()
    } catch {}
    setCaptchaToken(null)
    // beberapa browser/host kadang perlu remount agar UI ikut “tidak centang”
    setCaptchaKey((k) => k + 1)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(undefined)

    // pastikan sudah dicentang
    const token = captchaToken || captchaRef.current?.getValue()
    if (!token) {
      setError('Harap centang reCAPTCHA terlebih dahulu.')
      setLoading(false)
      return
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        recaptcha: token, // kirim token ke NextAuth
        redirect: false
      })

      if (!res) {
        setError('Tidak dapat menghubungi server otentikasi.')
        resetCaptcha()
        setLoading(false)
        return
      }
      if (res.error) {
        setError(mapError(res.error))
        // apapun errornya (password salah, dsb) token lama harus dibuang
        resetCaptcha()
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
      resetCaptcha()
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="container flex items-center justify-end py-4">
        <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          Hanya untuk Admin / Editor
        </div>
      </header>

      <main className="container pb-16">
        <div className="mx-auto grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
          {/* Panel gambar (desktop) */}
          <div className="relative hidden md:block">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_URL})` }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-black/0 mix-blend-multiply"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
              <h2 className="text-2xl font-bold drop-shadow-sm">Area Admin</h2>
              <p className="mt-1 text-sm text-white/90">Kelola konten situs.</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Masuk</h1>
              <p className="text-sm text-slate-600">Gunakan kredensial admin untuk melanjutkan.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border-slate-300"
                  placeholder="nama@contoh.go.id"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border-slate-300 pr-12"
                    placeholder="Masukan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                    aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA v2 Checkbox */}
              <ReCAPTCHA
                key={captchaKey}
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                onChange={(tok) => setCaptchaToken(tok)}
                onExpired={() => setCaptchaToken(null)}
                onErrored={() => setCaptchaToken(null)}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pastikan Anda adalah admin yang berwenang.</span>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Memproses…' : 'Masuk'}
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Catatan: akses hanya diberikan kepada akun dengan peran <strong>ADMIN</strong> atau{' '}
              <strong>EDITOR</strong>.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

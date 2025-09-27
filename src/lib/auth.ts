import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { verifyRecaptcha } from '@/lib/recaptcha'

export const authConfig: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 }, // 7 hari
  jwt: { maxAge: 60 * 60 * 24 * 7 }, // selaras dg session
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        // token dari reCAPTCHA (invisible), dikirim dari form login via signIn('credentials', { recaptcha })
        recaptcha: { label: 'reCAPTCHA', type: 'text' }
      },
      async authorize(credentials, req) {
        // 1) Verifikasi reCAPTCHA
        const token = String(credentials?.recaptcha || '')
        const verify = await verifyRecaptcha(token)
        if (!verify.success) {
          // akan tampil di client sebagai res.error === 'RecaptchaFailed'
          throw new Error('RecaptchaFailed')
        }

        // 2) Validasi kredensial
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return { id: user.id, name: user.name ?? '', email: user.email, role: user.role }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).role = (user as any).role
        ;(token as any).uid = (user as any).id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token as any).role
        session.user.id = (token as any).uid as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export const authConfig: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
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
        token.role = (user as any).role
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error role is custom
        session.user.role = token.role
        session.user.id = token.uid as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

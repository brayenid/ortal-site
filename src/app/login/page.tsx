import React from 'react'
import LoginPage from './login'
import { Metadata } from 'next'

const SITE_NAME = 'Masuk'
const SITE_DESC = 'Sistem Manajemen Konten'

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESC,
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    type: 'website',
    locale: 'id_ID'
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESC
  }
}

function Login() {
  return <LoginPage />
}

export default Login

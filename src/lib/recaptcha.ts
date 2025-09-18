export async function verifyRecaptcha(token: string, remoteIp?: string) {
  if (!token) return { success: false }

  const params = new URLSearchParams()
  params.append('secret', process.env.RECAPTCHA_SECRET_KEY || '')
  params.append('response', token)
  if (remoteIp) params.append('remoteip', remoteIp)

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store'
  })
  return (await res.json()) as { success: boolean; 'error-codes'?: string[] }
}

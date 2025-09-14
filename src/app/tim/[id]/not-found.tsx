import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container py-16">
      <h1 className="text-2xl font-bold">Tim tidak ditemukan</h1>
      <p className="text-slate-600 mt-2">Data tim tidak tersedia atau sudah dihapus.</p>
      <Link href="/#tim" className="btn mt-6">
        Kembali
      </Link>
    </div>
  )
}

# Website Kantor – Next.js + Prisma (Supabase) + NextAuth + Cloudinary

Light-mode only. Fitur:
- Artikel dengan kategori (termasuk kategori `gambar` & `pengumuman-penting`)
- Dashboard admin untuk input data
- Auth lokal (email/password) via **NextAuth Credentials**
- DB: **Prisma** ke **Supabase Postgres**
- Upload gambar/video ke **Cloudinary**
- Halaman utama: navbar, jumbotron, artikel terbaru, artikel kategori gambar, artikel kategori pengumuman penting, FAQ, credit

## Setup

1. **Install deps**
   ```bash
   pnpm i # atau npm i / yarn
   ```

2. **Konfigurasi env**
   Salin `.env.example` ke `.env` dan isi:
   - `NEXTAUTH_URL` (mis. `http://localhost:3000`)
   - `NEXTAUTH_SECRET` (string acak panjang)
   - `DATABASE_URL` (Supabase Postgres connection string)
   - Cloudinary creds

3. **Init Prisma & DB**
   ```bash
   npx prisma generate
   npx prisma db push
   pnpm seed  # membuat admin (ADMIN_EMAIL/ADMIN_PASSWORD) & kategori default
   ```

4. **Jalankan dev server**
   ```bash
   pnpm dev
   ```

## Akun Admin

- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` di `.env`, lalu jalankan `pnpm seed`.
- Login di `/login`. Pengguna baru via `/register` otomatis berperan `EDITOR`.

## Upload Media

- Semua upload menuju Cloudinary folder `CLOUDINARY_UPLOAD_FOLDER`.
- API: `POST /api/upload` (FormData: `file`), atau otomatis dari form Admin.

## Catatan Teknis

- Light-mode only (`darkMode: false` di Tailwind).
- Proteksi `/admin/*` via NextAuth middleware.
- Konten artikel disimpan sebagai HTML sederhana (`dangerouslySetInnerHTML` di detail page).
- Nama fungsi & file dibuat mudah dipahami; tipe TS ketat di util & config.

## Deploy

- Isi variable env di hosting (Vercel/dll) termasuk DB & Cloudinary.
- Jalankan `prisma generate` di build step, dan `prisma db push` jika perlu.

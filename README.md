# Inventa 📦

**Sistem Manajemen Aset & Persediaan**

Inventa adalah aplikasi sistem informasi inventaris yang dibangun untuk efisiensi dan keamanan data. Proyek ini dikembangkan menggunakan teknologi web modern untuk menjamin performa tinggi, keamanan autentikasi yang kuat, dan pengelolaan basis data yang mudah.

## 🚀 Teknologi yang Digunakan

Proyek ini dibangun di atas stack teknologi berikut:

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Bahasa:** TypeScript
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Autentikasi:** [Better Auth](https://www.better-auth.com/)
- **Keamanan Form:** [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
- **Email:** Nodemailer (SMTP)
- **Package Manager:** [pnpm](https://pnpm.io/)

## 📋 Prasyarat

Sebelum memulai, pastikan perangkat kamu telah terinstal:

1. **Node.js** (Versi LTS direkomendasikan)
2. **pnpm** (Install dengan `npm install -g pnpm`)
3. **PostgreSQL** (Pastikan service database berjalan)

## 🛠️ Langkah Instalasi

Ikuti langkah-langkah berikut untuk menjalankan proyek di lingkungan lokal (local development).

### 1. Clone Repository

```bash
git clone https://github.com/vexra/inventa.git
cd inventa

```

### 2. Install Dependencies

```bash
pnpm install

```

### 3. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env` (atau buat file `.env` baru) dan sesuaikan isinya.

```bash
cp env.example .env

```

Isi konfigurasi berikut ke dalam file `.env` kamu:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Database (PostgreSQL)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
DATABASE_URL=postgresql://postgres:password@localhost:5432/inventa

# Authentication (Better Auth)
# Generate secret baru menggunakan openssl rand -base64 32
BETTER_AUTH_SECRET=masukan_secret_random_disini
BETTER_AUTH_URL=http://localhost:3000

# Security (Cloudflare Turnstile)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=masukan_site_key_dari_cloudflare
TURNSTILE_SECRET_KEY=masukan_secret_key_dari_cloudflare

# Seeder Configuration
DEFAULT_PASSWORD=InventaUnila2026!$

# Email Service (Nodemailer SMTP)
# Contoh di bawah menggunakan Mailhog/Mailpit untuk local testing
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@inventa.fmipa.unila.ac.id

```

### 4. Setup Database

Pastikan PostgreSQL sudah berjalan dan database dengan nama `inventa` sudah dibuat.

**Push Schema ke Database:**
Gunakan Drizzle Kit untuk menyinkronkan skema kode ke database PostgreSQL.

```bash
npx drizzle-kit push

```

**Seeding Data Awal:**
Jalankan seeder untuk mengisi database dengan data awal (seperti akun admin default).

```bash
# Contoh jika menggunakan script custom di package.json
pnpm run db:seed

# Atau menjalankannya secara langsung
npx tsx lib/scripts/seeder.ts

```

> **Catatan:** Password default untuk akun yang di-generate oleh seeder adalah `InventaUnila2026!$` (sesuai `.env`).

### 5. Menjalankan Aplikasi

Jalankan server pengembangan:

```bash
pnpm dev

```

Buka [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) di browser kamu untuk melihat aplikasi.

---

## 🖌️ Code Style & Formatting

Proyek ini menggunakan **Prettier** untuk menjaga konsistensi gaya kode.

**Cek Format:**
Untuk memeriksa apakah ada file yang tidak sesuai dengan standar format.

```bash
pnpm format:check

```

**Perbaiki Format:**
Untuk memformat ulang seluruh kode secara otomatis.

```bash
pnpm format

```

---

## 📦 Build & Produksi

Untuk men-deploy aplikasi ke lingkungan produksi:

1. **Build Aplikasi:**

```bash
pnpm build

```

2. **Jalankan Server Produksi:**

```bash
pnpm start

```

---

## 🗄️ Manajemen Database (Drizzle Studio)

Untuk melihat dan mengelola data database secara visual melalui browser, kamu dapat menggunakan Drizzle Studio:

```bash
npx drizzle-kit studio

```

Akses studio di [https://local.drizzle.studio](https://local.drizzle.studio).

## 🛡️ Struktur Folder Utama

```text
inventa/
├── .github/             # Workflow GitHub Actions
├── .next/               # Hasil build Next.js
├── app/                 # Next.js App Router (Halaman & API)
├── components/          # Komponen UI (Atomic/Reusable)
├── db/                  # Konfigurasi Database & Schema
├── hooks/               # Custom React Hooks
├── lib/                 # Utilitas & Helper Functions
├── public/              # Aset statis (Gambar, Font)
├── drizzle.config.ts    # Konfigurasi Drizzle Kit
├── next.config.ts       # Konfigurasi Next.js
├── package.json         # Dependensi Proyek
└── ...

```

## 🤝 Kontribusi

Kontribusi sangat kami hargai. Jika Anda ingin melakukan perubahan besar atau menambahkan fitur utama, mohon buka Issue terlebih dahulu untuk mendiskusikan apa yang ingin diubah.

## 📄 Lisensi

[MIT](https://choosealicense.com/licenses/mit/)

```

```

import type { Metadata } from 'next'
import Link from 'next/link'

import { Home, MapPinOff } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '404 - Halaman Tidak Ditemukan',
  description: 'Halaman yang Anda cari tidak tersedia.',
}

export default function NotFound() {
  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-4 text-center">
      <div className="via-background to-background dark:via-background dark:to-background absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-100/80 dark:from-blue-950/50" />

      <div className="animate-in fade-in slide-in-from-bottom-5 flex max-w-lg flex-col items-center duration-500">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100/50 p-4 ring-8 ring-blue-50/30 backdrop-blur-sm dark:bg-blue-900/20 dark:ring-blue-900/10">
          <MapPinOff className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>

        <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
          Halaman Tidak Ditemukan
        </h1>

        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Maaf, kami tidak dapat menemukan halaman yang Anda cari. Mungkin tautannya rusak atau
          halaman telah dipindahkan.
        </p>

        <div className="mt-10">
          <Button
            size="lg"
            className="min-w-50 gap-2 bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500"
            asChild
          >
            <Link href="/">
              <Home className="h-5 w-5" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer Teknis di bagian bawah layar */}
      <p className="text-muted-foreground/70 absolute bottom-8 text-xs font-medium tracking-wider uppercase">
        Error Code: 404 Not Found
      </p>
    </div>
  )
}

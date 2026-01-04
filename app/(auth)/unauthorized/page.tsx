import Link from 'next/link'

import { ArrowLeft, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-4 text-center">
      <div className="via-background to-background dark:via-background dark:to-background absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-red-100/80 dark:from-red-950/50" />

      <div className="animate-in fade-in slide-in-from-bottom-5 flex max-w-lg flex-col items-center duration-500">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-red-100/50 p-4 ring-8 ring-red-50/30 backdrop-blur-sm dark:bg-red-900/20 dark:ring-red-900/10">
          <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
          Akses Ditolak
        </h1>

        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Maaf, Anda tidak memiliki kredensial atau izin administrator yang diperlukan untuk melihat
          halaman ini.
        </p>

        <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:min-w-100 sm:flex-row">
          <Button variant="outline" size="lg" className="w-full flex-1 gap-2" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>

          <Button
            size="lg"
            className="w-full flex-1 gap-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            asChild
          >
            <Link href="mailto:admin@inventa.fmipa.unila.ac.id">Hubungi Admin</Link>
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground/70 absolute bottom-8 text-xs font-medium tracking-wider uppercase">
        Error Code: 403 Forbidden
      </p>
    </div>
  )
}

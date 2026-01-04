import Link from 'next/link'

import { ArrowLeft, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-500" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>

        <div className="mt-8 flex gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>

          <Button asChild className="bg-red-600 text-white hover:bg-red-700">
            <Link href="mailto:admin@inventa.fmipa.unila.ac.id">Hubungi Admin</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-500">Error Code: 403 Forbidden</p>
      </div>
    </div>
  )
}

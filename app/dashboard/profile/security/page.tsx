'use client'

import Link from 'next/link'

import { ArrowLeft, ChevronRight, KeyRound, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 h-8 w-8">
            <Link href="/dashboard/profile">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Keamanan Akun</h1>
        </div>
        <p className="text-muted-foreground ml-8">Kelola kata sandi dan email login Anda.</p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="grid gap-4">
          <Link href="/dashboard/profile/security/password">
            <Card className="hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all duration-300">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Ganti Password</h3>
                  <p className="text-muted-foreground text-xs">
                    Perbarui kata sandi untuk keamanan.
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/profile/security/email">
            <Card className="hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all duration-300">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Ganti Email</h3>
                  <p className="text-muted-foreground text-xs">Ubah alamat email login Anda.</p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

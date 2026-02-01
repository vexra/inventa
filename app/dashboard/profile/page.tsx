'use client'

import Link from 'next/link'

import { ChevronRight, Lock, Pencil, ShieldCheck, UserCircle } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  if (isPending) {
    return <ProfileSkeleton />
  }

  const user = session?.user

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground">
          Kelola informasi pribadi, keamanan akun, dan preferensi Anda.
        </p>
      </div>

      <Card className="border-border/50 bg-card relative overflow-hidden shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-4 right-4 z-10 sm:top-8 sm:right-8">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 w-8 rounded-full p-0 sm:h-9 sm:w-auto sm:px-4 sm:py-2"
          >
            <Link href="/dashboard/profile/edit">
              <Pencil className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit Profile</span>
              <span className="sr-only">Edit Profile</span>
            </Link>
          </Button>
        </div>

        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative">
              <Avatar className="border-background h-24 w-24 border-4 shadow-sm sm:h-32 sm:w-32">
                <AvatarImage src={user?.image || ''} alt={user?.name} className="object-cover" />
                <AvatarFallback className="text-muted-foreground bg-muted text-4xl font-semibold">
                  {getInitials(user?.name || 'User')}
                </AvatarFallback>
              </Avatar>
              <span className="border-background absolute right-1 bottom-1 h-4 w-4 rounded-full border-2 bg-green-500 sm:right-2 sm:bottom-2" />
            </div>

            <div className="flex flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <div className="space-y-1 pr-0 sm:pr-24">
                <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  {user?.name}
                </h2>
                <p className="text-muted-foreground text-sm font-medium sm:text-base">
                  {user?.email}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary" className="px-3 py-1 text-xs font-medium uppercase">
                  {user?.role || 'User'}
                </Badge>

                {user?.emailVerified && (
                  <Badge
                    variant="outline"
                    className="border-green-500/30 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified Account
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <MenuLink
          href="/dashboard/profile/avatar"
          icon={<UserCircle className="h-5 w-5" />}
          title="Foto Profil"
          desc="Personalisasi akun dengan foto terbaru."
          color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
        <MenuLink
          href="/dashboard/profile/security"
          icon={<Lock className="h-5 w-5" />}
          title="Keamanan & Password"
          desc="Kelola sandi dan verifikasi dua langkah."
          color="bg-orange-500/10 text-orange-600 dark:text-orange-400"
        />
      </div>
    </div>
  )
}

function MenuLink({
  href,
  icon,
  title,
  desc,
  color,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="border-border/50 hover:border-primary/50 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-6">
          <div
            className={cn(
              'rounded-xl p-3 ring-1 ring-black/5 ring-inset dark:ring-white/10',
              color,
            )}
          >
            {icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground group-hover:text-primary font-semibold tracking-tight transition-colors">
                {title}
              </h3>
              <ChevronRight className="text-muted-foreground/50 group-hover:text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="relative rounded-xl border p-6 sm:p-8">
        <Skeleton className="absolute top-8 right-8 hidden h-9 w-24 rounded-full sm:block" />
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Skeleton className="h-24 w-24 rounded-full sm:h-32 sm:w-32" />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex justify-center gap-2 pt-2 sm:justify-start">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

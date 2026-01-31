'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { BadgeCheck, Bell, CircleHelp, Keyboard, LogOut } from 'lucide-react'

import { getUnreadCount } from '@/app/dashboard/notifications/actions'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'

interface UserNavProps {
  children?: React.ReactNode
  side?: 'bottom' | 'right' | 'top' | 'left'
  align?: 'start' | 'end' | 'center'
  className?: string
}

export function UserNav({ children, side = 'bottom', align = 'end' }: UserNavProps) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (session?.user) {
      getUnreadCount().then((count) => setUnreadCount(count))
    }
  }, [session])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/sign-in')
        },
      },
    })
  }

  if (isPending) {
    if (children) return null
    return <Skeleton className="h-8 w-8 rounded-full" />
  }

  if (!session?.user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8 overflow-visible">
              <AvatarImage
                src={session.user.image || ''}
                alt={session.user.name}
                className="rounded-full object-cover"
              />
              <AvatarFallback className="rounded-full">
                {getInitials(session.user.name)}
              </AvatarFallback>

              {unreadCount > 0 && <AvatarBadge className="bg-green-600 dark:bg-green-800" />}
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={side}
        align={align}
        forceMount
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={session.user.image || ''}
                alt={session.user.name}
                className="rounded-lg"
              />
              <AvatarFallback className="rounded-lg">
                {getInitials(session.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{session.user.name}</span>
              <span className="truncate text-xs">{session.user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="#" className="flex w-full cursor-pointer items-center">
              <BadgeCheck className="mr-2 size-4" />
              <span>Akun</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/notifications"
              className="flex w-full cursor-pointer items-center"
            >
              <Bell className="mr-2 size-4" />
              <span>Notifikasi</span>

              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px]"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="#" className="flex w-full cursor-pointer items-center">
              <Keyboard className="mr-2 size-4" />
              <span>Pintasan Keyboard</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="#" className="flex w-full cursor-pointer items-center">
              <CircleHelp className="mr-2 size-4" />
              <span>Pusat Bantuan</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
        >
          <LogOut className="mr-2 size-4 text-red-600 focus:text-red-600" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

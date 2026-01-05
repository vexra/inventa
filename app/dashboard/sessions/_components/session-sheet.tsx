'use client'

import { useEffect, useState } from 'react'

import { Laptop, Loader2, MonitorSmartphone, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { UAParser } from 'ua-parser-js'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

import { getUserSessionsAction, revokeAllSessionsAction, revokeSessionAction } from '../actions'

interface SessionData {
  token: string
  userAgent?: string | null
  ipAddress?: string | null
  isCurrent?: boolean
  expiresAt: Date | string
}

interface SessionSheetProps {
  userId: string
  userName: string
}

export function SessionSheet({ userId, userName }: SessionSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isRevokeAllDialogOpen, setIsRevokeAllDialogOpen] = useState(false)
  const [isRevokingAll, setIsRevokingAll] = useState(false)
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [isRevokingSingle, setIsRevokingSingle] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let isActive = true

    const fetchSessions = async () => {
      setIsLoading(true)
      try {
        const res = await getUserSessionsAction(userId)
        if (isActive && res.success && res.data) {
          const sessionData = res.data as { sessions: SessionData[] }
          setSessions(sessionData.sessions || [])
        } else if (isActive) {
          toast.error(res.error || 'Gagal memuat sesi')
        }
      } catch {
        if (isActive) toast.error('Terjadi kesalahan')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    fetchSessions()

    return () => {
      isActive = false
    }
  }, [isOpen, userId])

  async function refreshSessions() {
    setIsLoading(true)
    const res = await getUserSessionsAction(userId)
    if (res.success && res.data) {
      const sessionData = res.data as { sessions: SessionData[] }
      setSessions(sessionData.sessions || [])
    }
    setIsLoading(false)
  }

  function onRevokeSingleClick(token: string) {
    setSessionToRevoke(token)
  }

  async function onConfirmRevokeSingle() {
    if (!sessionToRevoke) return

    setIsRevokingSingle(true)
    const res = await revokeSessionAction(sessionToRevoke)

    if (res.success) {
      toast.success('Sesi berhasil dihentikan')
      await refreshSessions()
      setSessionToRevoke(null)
    } else {
      toast.error(res.error)
    }
    setIsRevokingSingle(false)
  }

  function onRevokeAllClick() {
    setIsRevokeAllDialogOpen(true)
  }

  async function onConfirmRevokeAll() {
    setIsRevokingAll(true)
    const res = await revokeAllSessionsAction(userId)

    if (res.success) {
      toast.success('Semua sesi berhasil dihentikan')
      setSessions([])
      setIsOpen(false)
      setIsRevokeAllDialogOpen(false)
    } else {
      toast.error(res.error)
    }
    setIsRevokingAll(false)
  }

  const parseUA = (uaString?: string | null) => {
    if (!uaString) return 'Unknown Device'
    const parser = new UAParser(uaString)
    const result = parser.getResult()
    const browser = result.browser.name || 'Browser'
    const os = result.os.name || 'OS'
    return `${browser} on ${os}`
  }

  const getSessionNameToBeRevoked = () => {
    const session = sessions.find((s) => s.token === sessionToRevoke)
    return session ? parseUA(session.userAgent) : 'Perangkat ini'
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <MonitorSmartphone className="mr-2 h-3.5 w-3.5" />
            Kelola Sesi
          </Button>
        </SheetTrigger>

        <SheetContent className="flex h-full flex-col gap-0 p-6 sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle>Sesi Aktif</SheetTitle>
            <SheetDescription>
              Kelola perangkat yang login sebagai{' '}
              <span className="text-foreground font-medium">{userName}</span>.
            </SheetDescription>
          </SheetHeader>

          <div className="relative min-h-0 flex-1">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                Tidak ada sesi aktif ditemukan.
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="flex flex-col gap-3 pb-2">
                  {sessions.map((session) => (
                    <div
                      key={session.token}
                      className="bg-card/50 flex flex-col gap-3 rounded-lg border p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full">
                            <Laptop className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{parseUA(session.userAgent)}</p>
                            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                              {session.ipAddress || 'IP Hidden'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={session.isCurrent ? 'default' : 'secondary'}
                          className="px-2 text-[10px]"
                        >
                          {session.isCurrent ? 'Current' : 'Active'}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center justify-between border-t pt-2">
                        <span className="text-muted-foreground text-xs">
                          Exp: {new Date(session.expiresAt).toLocaleDateString()}
                        </span>
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2"
                            onClick={() => onRevokeSingleClick(session.token)}
                          >
                            Cabut Akses
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            <Button
              variant="destructive"
              className="w-full"
              disabled={isLoading || sessions.length === 0 || isRevokingAll}
              onClick={onRevokeAllClick}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Paksa Logout Semua Perangkat
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!sessionToRevoke} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cabut Akses Perangkat?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengeluarkan perangkat{' '}
              <strong>{getSessionNameToBeRevoked()}</strong>? Pengguna harus login kembali di
              perangkat tersebut.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionToRevoke(null)}
              disabled={isRevokingSingle}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRevokeSingle}
              disabled={isRevokingSingle}
            >
              {isRevokingSingle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Cabut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRevokeAllDialogOpen} onOpenChange={setIsRevokeAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Logout Paksa</DialogTitle>
            <DialogDescription>
              Tindakan ini akan mengeluarkan pengguna <strong>{userName}</strong> dari semua
              perangkat yang sedang login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRevokeAllDialogOpen(false)}
              disabled={isRevokingAll}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={onConfirmRevokeAll} disabled={isRevokingAll}>
              {isRevokingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Logout Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState } from 'react'

import { AlertTriangle, Ban, KeyRound, MoreHorizontal, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authClient } from '@/lib/auth-client'

import { banUserAction, deleteUserAction, unbanUserAction } from '../actions'
import { UserDialog } from './user-dialog'

export function UserList({
  data,
  units,
  warehouses,
}: {
  data: any[]
  units: any[]
  warehouses: any[]
}) {
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userToBan, setUserToBan] = useState<any>(null)
  const [banReason, setBanReason] = useState('')
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)

  const onBanClick = (user: any) => {
    if (user.banned) {
      handleProcessBan(user.id, true, '')
    } else {
      setBanReason('')
      setUserToBan(user)
    }
  }

  const handleProcessBan = async (id: string, isBanned: boolean, reason: string) => {
    setIsPending(true)
    try {
      let result
      if (isBanned) {
        result = await unbanUserAction(id)
      } else {
        result = await banUserAction(id, reason)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setUserToBan(null)
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsPending(false)
    }
  }

  const handleImpersonate = async (id: string) => {
    setIsPending(true)
    try {
      await authClient.admin.impersonateUser({ userId: id })
      toast.success('Beralih akun...')
      window.location.href = '/dashboard'
    } catch (error) {
      console.error(error)
      toast.error('Gagal beralih akun. Silakan coba lagi.')
      setIsPending(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsPending(true)
    try {
      const result = await deleteUserAction(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setUserToDelete(null)
      }
    } catch {
      toast.error('Gagal menghapus user')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Penempatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground text-xs">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {user.role?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.unit
                    ? `Unit: ${user.unit.name}`
                    : user.warehouse
                      ? `Gudang: ${user.warehouse.name}`
                      : '-'}
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="secondary">Aktif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Aksi</DropdownMenuLabel>

                      <DropdownMenuItem onClick={() => setEditingUser(user)}>
                        <UserCog className="mr-2 h-4 w-4" /> Edit Detail
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                        <KeyRound className="mr-2 h-4 w-4" /> Masuk sbg User
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {user.usageCount === 0 && (
                        <DropdownMenuItem
                          onClick={() => setUserToDelete(user)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" /> Hapus
                          Permanen
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => onBanClick(user)}
                        className={
                          user.banned
                            ? 'text-green-600 focus:text-green-600'
                            : 'text-red-600 focus:text-red-600'
                        }
                      >
                        <Ban
                          className={`mr-2 h-4 w-4 ${
                            user.banned ? 'text-green-600' : 'text-red-600'
                          }`}
                        />
                        {user.banned ? 'Buka Blokir' : 'Blokir User'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <UserDialog
          mode="edit"
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          initialData={editingUser}
          units={units}
          warehouses={warehouses}
        />
      )}

      <Dialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Blokir Pengguna
            </DialogTitle>
            <DialogDescription>
              Anda akan memblokir akses login untuk <b>{userToBan?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="reason">Alasan Blokir (Opsional)</Label>
              <Input
                id="reason"
                placeholder="Contoh: Spamming, Resign, dll..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToBan(null)} disabled={isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleProcessBan(userToBan.id, false, banReason)}
              disabled={isPending}
            >
              {isPending ? 'Memproses...' : 'Ya, Blokir User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Hapus Pengguna Permanen
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus user <b>{userToDelete?.name}</b> secara permanen.
              <br />
              <br />
              Tindakan ini <b>tidak dapat dibatalkan</b> dan data akun akan hilang selamanya dari
              database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(userToDelete.id)}
              disabled={isPending}
            >
              {isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

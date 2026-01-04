'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { Ban, KeyRound, MoreHorizontal, UserCog } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authClient } from '@/lib/auth-client'

import { banUserAction, unbanUserAction } from '../actions'
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
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)

  const handleBan = async (id: string, isBanned: boolean) => {
    setIsPending(true)
    try {
      let result

      if (isBanned) {
        result = await unbanUserAction(id)
      } else {
        result = await banUserAction(id)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsPending(false)
    }
  }

  const handleImpersonate = async (id: string) => {
    await authClient.admin.impersonateUser({ userId: id })
    toast.success('Beralih akun...')
    router.push('/dashboard')
    router.refresh()
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
                      <DropdownMenuItem
                        onClick={() => handleBan(user.id, user.banned || false)}
                        className={user.banned ? 'text-green-600' : 'text-red-600'}
                      >
                        <Ban className="mr-2 h-4 w-4" />{' '}
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
    </>
  )
}

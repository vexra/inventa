'use client'

import { useState } from 'react'

import {
  Ban,
  Building2,
  KeyRound,
  MoreHorizontal,
  School,
  Trash2,
  UserCog,
  VenetianMask,
  Warehouse,
} from 'lucide-react'
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
import { userRoleEnum } from '@/db/schema'
import { authClient } from '@/lib/auth-client'

import {
  banUserAction,
  deleteUserAction,
  logImpersonationAction,
  unbanUserAction,
} from '../actions'
import { UserDialog } from './user-dialog'

type UserRole = (typeof userRoleEnum.enumValues)[number]

interface UnitData {
  id: string
  name: string
  facultyId: string | null
}

interface WarehouseData {
  id: string
  name: string
}

interface FacultyData {
  id: string
  name: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  banned: boolean
  banReason?: string | null
  usageCount: number

  unitId: string | null
  warehouseId: string | null
  facultyId: string | null
  unitFacultyId: string | null

  unit: { name: string } | null
  warehouse: { name: string } | null
}

interface UserListProps {
  data: UserData[]
  units: UnitData[]
  warehouses: WarehouseData[]
  faculties: FacultyData[]
}

export function UserList({ data, units, warehouses, faculties }: UserListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const [userToBan, setUserToBan] = useState<UserData | null>(null)
  const [banReason, setBanReason] = useState('')
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)

  const [userToImpersonate, setUserToImpersonate] = useState<UserData | null>(null)

  const userToEdit = data.find((u) => u.id === editingId)

  const confirmImpersonate = async () => {
    if (!userToImpersonate) return

    setIsPending(true)
    const toastId = toast.loading(`Menyiapkan sesi ${userToImpersonate.name}...`)

    try {
      await logImpersonationAction(userToImpersonate.id)

      const { error } = await authClient.admin.impersonateUser({
        userId: userToImpersonate.id,
      })

      if (error) {
        toast.error(error.message || 'Gagal login sebagai user', { id: toastId })
        setIsPending(false)
        setUserToImpersonate(null)
      } else {
        toast.success(`Berhasil masuk sebagai ${userToImpersonate.name}`, { id: toastId })

        window.location.href = '/dashboard'
      }
    } catch {
      toast.error('Terjadi kesalahan sistem', { id: toastId })
      setIsPending(false)
      setUserToImpersonate(null)
    }
  }

  const handleProcessBan = async (userId: string, isBanned: boolean, reason?: string) => {
    setIsPending(true)
    try {
      if (isBanned) {
        const res = await unbanUserAction(userId)
        if (res.error) toast.error(res.error)
        else {
          toast.success(res.message)
          setUserToBan(null)
          setBanReason('')
        }
      } else {
        const res = await banUserAction(userId, reason)
        if (res.error) toast.error(res.error)
        else {
          toast.success(res.message)
          setUserToBan(null)
          setBanReason('')
        }
      }
    } catch {
      toast.error('Gagal memproses status user')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (userId: string) => {
    setIsPending(true)
    try {
      const res = await deleteUserAction(userId)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.message)
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
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Afiliasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground text-xs">{user.email}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {user.unit ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{user.unit.name}</span>
                      </div>
                    ) : user.warehouse ? (
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">{user.warehouse.name}</span>
                      </div>
                    ) : user.role === 'faculty_admin' ? (
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">
                          {faculties.find((f) => f.id === user.facultyId)?.name || (
                            <span className="text-muted-foreground italic">Belum set fakultas</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Aktif
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setUserToImpersonate(user)}
                          disabled={isPending || user.role === 'super_admin'}
                        >
                          <VenetianMask className="mr-2 h-4 w-4" /> Login Sebagai User
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => setEditingId(user.id)}>
                          <UserCog className="mr-2 h-4 w-4" /> Edit Role/Data
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setUserToBan(user)}>
                          {user.banned ? (
                            <>
                              <KeyRound className="mr-2 h-4 w-4" /> Buka Blokir
                            </>
                          ) : (
                            <>
                              <Ban className="mr-2 h-4 w-4" /> Blokir User
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" /> Hapus
                          Permanen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- DIALOG IMPERSONATE --- */}
      <Dialog
        open={!!userToImpersonate}
        onOpenChange={(open) => !open && setUserToImpersonate(null)}
      >
        <DialogContent className="sm:max-w-md dark:border-slate-800">
          <DialogHeader>
            <div className="mb-2 flex flex-col items-center gap-2">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <VenetianMask className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl">Login Sebagai User</DialogTitle>
            </div>
            <DialogDescription className="text-center text-slate-500 dark:text-slate-400">
              Anda akan masuk ke dalam sistem sebagai:
            </DialogDescription>
          </DialogHeader>

          {/* User Profile Card */}
          <div className="mb-2 flex items-center justify-center rounded-lg border bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {userToImpersonate?.name}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {userToImpersonate?.email}
              </div>
              <Badge
                variant="outline"
                className="mt-2 border-blue-200 bg-white text-blue-600 capitalize dark:border-blue-900 dark:bg-slate-950 dark:text-blue-400"
              >
                {userToImpersonate?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Warning Box */}
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex gap-3">
              <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="mb-1 font-semibold">Mode Penyamaran</p>
                <p className="leading-relaxed opacity-90 dark:text-blue-200/80">
                  Sesi Super Admin Anda akan <strong>dijeda</strong>. Untuk kembali, Anda perlu
                  Logout atau menekan tombol &quot;Stop Impersonating&quot;.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setUserToImpersonate(null)}
              disabled={isPending}
              className="w-full text-slate-500 hover:text-slate-800 sm:w-auto dark:text-slate-400 dark:hover:text-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={confirmImpersonate}
              disabled={isPending}
              className="w-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isPending ? (
                <>Mengalihkan Sesi...</>
              ) : (
                <>
                  <VenetianMask className="mr-2 h-4 w-4" />
                  Masuk Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG EDIT --- */}
      {editingId && userToEdit && (
        <UserDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          units={units}
          warehouses={warehouses}
          faculties={faculties}
          initialData={{
            id: userToEdit.id,
            name: userToEdit.name,
            email: userToEdit.email,
            // 2. Cast string role ke tipe UserRole yang valid
            role: userToEdit.role as UserRole,
            unitId: userToEdit.unitId || undefined,
            warehouseId: userToEdit.warehouseId || undefined,
            facultyId:
              userToEdit.role === 'faculty_admin'
                ? userToEdit.facultyId || undefined
                : userToEdit.unitFacultyId || undefined,
          }}
        />
      )}

      {/* --- DIALOG BAN / UNBAN --- */}
      <Dialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userToBan?.banned ? 'Buka Blokir User' : 'Blokir User'}</DialogTitle>
            <DialogDescription>
              {userToBan?.banned
                ? 'User akan dapat login kembali.'
                : 'User tidak akan bisa login ke sistem.'}
            </DialogDescription>
          </DialogHeader>

          {!userToBan?.banned && (
            <div className="grid gap-2 py-2">
              <Label htmlFor="reason">Alasan Blokir</Label>
              <Input
                id="reason"
                placeholder="Contoh: Resign, Penyalahgunaan akun..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToBan(null)} disabled={isPending}>
              Batal
            </Button>
            <Button
              variant={userToBan?.banned ? 'default' : 'destructive'}
              onClick={() =>
                userToBan && handleProcessBan(userToBan.id, userToBan.banned, banReason)
              }
              disabled={isPending}
            >
              {isPending ? 'Memproses...' : userToBan?.banned ? 'Buka Blokir' : 'Ya, Blokir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG DELETE --- */}
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
              Tindakan ini <b>tidak dapat dibatalkan</b>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && handleDelete(userToDelete.id)}
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

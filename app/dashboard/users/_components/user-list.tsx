'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Building2,
  KeyRound,
  MoreHorizontal,
  School,
  Settings2,
  Trash2,
  UserCog,
  VenetianMask,
  Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  DropdownMenuCheckboxItem,
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
import { cn } from '@/lib/utils'

import {
  banUserAction,
  deleteUserAction,
  logImpersonationAction,
  unbanUserAction,
} from '../actions'
import { UserDialog } from './user-dialog'

interface Unit {
  id: string
  name: string
  facultyId: string | null
}

interface Warehouse {
  id: string
  name: string
}

interface Faculty {
  id: string
  name: string
}

type UserRole = (typeof userRoleEnum.enumValues)[number]

interface UserData {
  id: string
  name: string
  email: string
  role: string
  banned: boolean
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
  units: Unit[]
  warehouses: Warehouse[]
  faculties: Faculty[]
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  currentSort: {
    column: string
    direction: 'asc' | 'desc'
  }
}

function SortableHeader({
  id: columnId,
  label,
  currentSort,
  onSort,
  className,
}: {
  id: string
  label: string
  currentSort: { column: string; direction: 'asc' | 'desc' }
  onSort: (id: string) => void
  className?: string
}) {
  return (
    <TableHead className={cn('h-10 px-0', className)}>
      <Button
        variant="ghost"
        onClick={() => onSort(columnId)}
        className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium tracking-wider uppercase"
      >
        {label}
        {currentSort.column === columnId && (
          <ArrowUpDown
            className={cn('ml-2 h-3 w-3', currentSort.direction === 'asc' && 'rotate-180')}
          />
        )}
      </Button>
    </TableHead>
  )
}

export function UserList({
  data,
  units,
  warehouses,
  faculties,
  metadata,
  currentSort,
}: UserListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const [userToBan, setUserToBan] = useState<UserData | null>(null)
  const [banReason, setBanReason] = useState('')
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)
  const [userToImpersonate, setUserToImpersonate] = useState<UserData | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    role: true,
    affiliation: true,
    status: true,
  })

  const userToEdit = data.find((u) => u.id === editingId)

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', column)
    params.set('order', isAsc ? 'desc' : 'asc')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
      const res = isBanned ? await unbanUserAction(userId) : await banUserAction(userId, reason)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
        setUserToBan(null)
        setBanReason('')
      }
    } catch {
      toast.error('Gagal memproses status user')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsPending(true)
    try {
      const res = await deleteUserAction(userToDelete.id)
      if (res.error) {
        toast.error(res.error)
      } else {
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
    <div className="w-full space-y-4">
      <div className="bg-card rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari nama atau email..." limit={metadata.itemsPerPage}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-9 px-3 text-xs sm:flex"
              >
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                Tampilan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                Atur Kolom
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.user}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, user: !!v }))}
              >
                User
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.role}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, role: !!v }))}
              >
                Role
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.affiliation}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, affiliation: !!v }))}
              >
                Afiliasi
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
              >
                Status
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {visibleColumns.user && (
                  <SortableHeader
                    id="name"
                    label="User"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.role && (
                  <SortableHeader
                    id="role"
                    label="Role"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.affiliation && (
                  <TableHead className="px-4 text-xs font-medium tracking-wider uppercase">
                    Afiliasi
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <SortableHeader
                    id="banned"
                    label="Status"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                <TableHead className="w-12 px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-muted/30">
                    {visibleColumns.user && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm leading-none font-medium">{user.name}</span>
                          <span className="text-muted-foreground mt-1 text-[11px] font-normal tracking-tight">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.role && (
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold tracking-tighter uppercase shadow-none"
                        >
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    )}

                    {visibleColumns.affiliation && (
                      <TableCell className="px-4 py-3">
                        {user.unit ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-blue-500" />
                            <span className="max-w-37.5 truncate">{user.unit.name}</span>
                          </div>
                        ) : user.warehouse ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Warehouse className="h-3.5 w-3.5 text-amber-500" />
                            <span className="max-w-37.5 truncate">{user.warehouse.name}</span>
                          </div>
                        ) : user.role === 'faculty_admin' ? (
                          <div className="flex items-center gap-2 text-sm">
                            <School className="h-3.5 w-3.5 text-purple-500" />
                            <span className="max-w-37.5 truncate">
                              {faculties.find((f) => f.id === user.facultyId)?.name ||
                                'Fakultas N/A'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">-</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell className="px-4 py-3">
                        {user.banned ? (
                          <Badge variant="destructive" className="text-[10px] font-semibold">
                            Banned
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
                            Aktif
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
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
                            className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
                            onClick={() => setUserToDelete(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Permanen
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

        <DataTablePagination metadata={metadata} />
      </div>

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

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Pengguna Permanen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user{' '}
              <span className="text-foreground font-bold">{userToDelete?.name}</span> secara
              permanen? Tindakan ini <strong>tidak dapat dibatalkan</strong> dan semua data terkait
              user ini akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

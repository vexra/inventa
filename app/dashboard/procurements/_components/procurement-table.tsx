'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  LucideIcon,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Settings2,
  Trash2,
  User,
  X,
  XCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { deleteProcurement, verifyProcurement } from '../actions'
import { ProcurementDialog } from './procurement-dialog'
import { ReceiveDialog } from './receive-dialog'

type ProcurementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

interface ProcurementData {
  id: string
  code: string
  status: string | null
  requestDate: Date | null
  description: string | null
  notes: string | null
  requester: { name: string | null } | null
  items: {
    id: string
    consumableId: string
    unit: string | null
    quantity: string | number
    consumable: {
      name: string
      hasExpiry: boolean
    }
  }[]
}

interface ConsumableOption {
  id: string
  name: string
  unit: string
  hasExpiry: boolean
}

interface ProcurementTableProps {
  data: ProcurementData[]
  consumables: ConsumableOption[]
  userRole: string
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
  currentStatusFilter: string
}

const STATUS_CONFIG: Record<
  ProcurementStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  PENDING: {
    label: 'Menunggu',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    icon: Clock,
  },
  APPROVED: {
    label: 'Disetujui',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Ditolak',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
  },
  COMPLETED: {
    label: 'Selesai',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: PackageCheck,
  },
}

function StatusBadge({ status }: { status: ProcurementStatus | string | null }) {
  const normalizedStatus = (
    status && status in STATUS_CONFIG ? status : 'PENDING'
  ) as ProcurementStatus
  const config = STATUS_CONFIG[normalizedStatus]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`gap-1 font-normal ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
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

export function ProcurementTable({
  data,
  consumables,
  userRole,
  metadata,
  currentSort,
  currentStatusFilter,
}: ProcurementTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectLoading, setIsRejectLoading] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    status: true,
    date: true,
    requester: true,
    count: true,
    actions: true,
  })

  const itemToEdit = data.find((item) => item.id === editingId)
  const itemToReceive = data.find((item) => item.id === receivingId)
  const showRequesterColumn = userRole === 'faculty_admin' || userRole === 'super_admin'

  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) newParams.delete(key)
      else newParams.set(key, String(value))
    })
    return newParams.toString()
  }

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    router.push(
      `${pathname}?${createQueryString({
        sort: column,
        order: isAsc ? 'desc' : 'asc',
      })}`,
      { scroll: false },
    )
  }

  const handleStatusFilterChange = (status: string) => {
    router.push(
      `${pathname}?${createQueryString({
        status: status === 'all' ? null : status,
        page: 1,
      })}`,
      { scroll: false },
    )
  }

  const handleDelete = async () => {
    if (!deletingId) return
    const toastId = toast.loading('Membatalkan pengajuan...')
    try {
      const result = await deleteProcurement(deletingId)
      if (result.success) {
        toast.success(result.message, { id: toastId })
        router.refresh()
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch {
      toast.error('Gagal memproses permintaan', { id: toastId })
    } finally {
      setDeletingId(null)
    }
  }

  const handleApprove = async (id: string) => {
    const toastId = toast.loading('Memproses persetujuan...')
    try {
      const res = await verifyProcurement(id, 'APPROVED')
      if (res.error) toast.error(res.error, { id: toastId })
      else {
        toast.success(res.message, { id: toastId })
        router.refresh()
      }
    } catch {
      toast.error('Gagal memproses', { id: toastId })
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectId) return
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    setIsRejectLoading(true)
    const toastId = toast.loading('Menolak pengajuan...')
    try {
      const res = await verifyProcurement(rejectId, 'REJECTED', rejectReason)
      if (res.error) {
        toast.error(res.error, { id: toastId })
      } else {
        toast.success(res.message, { id: toastId })
        setRejectId(null)
        setRejectReason('')
        router.refresh()
      }
    } catch {
      toast.error('Gagal memproses', { id: toastId })
    } finally {
      setIsRejectLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari No. PO / Pemohon..." limit={metadata.itemsPerPage}>
          <Select value={currentStatusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="h-9 w-45 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Filter className="text-muted-foreground h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.description}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, description: c }))}
              >
                Info Pengajuan
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, status: c }))}
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.date}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, date: c }))}
              >
                Tanggal
              </DropdownMenuCheckboxItem>
              {showRequesterColumn && (
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.requester}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, requester: c }))}
                >
                  Diajukan Oleh
                </DropdownMenuCheckboxItem>
              )}
              <DropdownMenuCheckboxItem
                checked={visibleColumns.count}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, count: c }))}
              >
                Total Item
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10 text-center text-xs">#</TableHead>

                {visibleColumns.description && (
                  <SortableHeader
                    id="description"
                    label="Pengajuan"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="min-w-60"
                  />
                )}
                {visibleColumns.status && (
                  <SortableHeader
                    id="status"
                    label="Status"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="w-40"
                  />
                )}
                {visibleColumns.date && (
                  <SortableHeader
                    id="createdAt"
                    label="Tanggal"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.requester && showRequesterColumn && (
                  <SortableHeader
                    id="requester"
                    label="Diajukan Oleh"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.count && (
                  <TableHead className="text-center text-xs font-medium tracking-wider uppercase">
                    Total Item
                  </TableHead>
                )}
                <TableHead className="w-16 text-right text-xs uppercase">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-24 text-center text-sm">
                    Belum ada pengajuan pengadaan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="group hover:bg-muted/50 border-b last:border-0"
                  >
                    <TableCell className="text-muted-foreground text-center text-xs">
                      {(metadata.currentPage - 1) * metadata.itemsPerPage + index + 1}
                    </TableCell>

                    {visibleColumns.description && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground line-clamp-2 text-sm font-semibold">
                            {item.description || 'Tanpa Judul'}
                          </span>
                          <span className="bg-muted text-muted-foreground w-fit rounded px-1.5 py-0.5 font-mono text-xs">
                            {item.code}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell className="px-4 py-3">
                        <StatusBadge status={item.status as ProcurementStatus} />
                      </TableCell>
                    )}

                    {visibleColumns.date && (
                      <TableCell className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                          <span>
                            {item.requestDate
                              ? format(new Date(item.requestDate), 'dd MMM yyyy', {
                                  locale: idLocale,
                                })
                              : '-'}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.requester && showRequesterColumn && (
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="text-muted-foreground h-3.5 w-3.5" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {item.requester?.name || '-'}
                            </span>
                            <span className="text-muted-foreground text-[10px]">Staff Gudang</span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.count && (
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {item.items.length} Barang
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/procurements/${item.id}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                            </Link>
                          </DropdownMenuItem>

                          {(userRole === 'faculty_admin' || userRole === 'super_admin') &&
                            item.status === 'PENDING' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleApprove(item.id)}
                                  className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:text-green-400 dark:focus:bg-green-900/40"
                                >
                                  <Check className="mr-2 h-4 w-4" /> Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setRejectId(item.id)}
                                  className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/40"
                                >
                                  <X className="mr-2 h-4 w-4" /> Tolak
                                </DropdownMenuItem>
                              </>
                            )}

                          {(userRole === 'warehouse_staff' || userRole === 'super_admin') &&
                            item.status === 'APPROVED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setReceivingId(item.id)}
                                  className="text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:text-blue-400 dark:focus:bg-blue-900/40"
                                >
                                  <PackageCheck className="mr-2 h-4 w-4" /> Terima Barang
                                </DropdownMenuItem>
                              </>
                            )}

                          {item.status === 'PENDING' && userRole === 'warehouse_staff' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingId(item.id)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-900/40"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Hapus
                              </DropdownMenuItem>
                            </>
                          )}

                          {(userRole === 'warehouse_staff' || userRole === 'super_admin') &&
                            item.status === 'REJECTED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setEditingId(item.id)}
                                  className="text-orange-600 focus:bg-orange-50 focus:text-orange-700 dark:text-orange-400 dark:focus:bg-orange-900/40"
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Perbaiki Pengajuan
                                </DropdownMenuItem>
                              </>
                            )}
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

      {receivingId && itemToReceive && (
        <ReceiveDialog
          procurement={itemToReceive}
          open={!!receivingId}
          onOpenChange={(open) => !open && setReceivingId(null)}
        />
      )}

      {editingId && itemToEdit && (
        <ProcurementDialog
          consumables={consumables}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={{
            ...itemToEdit,
            description: itemToEdit.description,
            notes: itemToEdit.notes,
            status: itemToEdit.status || 'PENDING',
            items: itemToEdit.items.map((i) => ({
              consumableId: i.consumableId,
              quantity: Number(i.quantity),
            })),
          }}
          trigger={<span className="hidden"></span>}
        />
      )}

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-muted-foreground mb-2 block text-sm">
              Alasan Penolakan (Wajib diisi):
            </label>
            <Textarea
              placeholder="Contoh: Anggaran tidak mencukupi, harap kurangi jumlah barang..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-25"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || isRejectLoading}
            >
              {isRejectLoading ? 'Memproses...' : 'Tolak Pengajuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Pengajuan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan pengajuan ini? Data akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

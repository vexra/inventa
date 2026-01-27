'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  ArrowUpDown,
  Ban,
  Box,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  LucideIcon,
  MoreHorizontal,
  Package,
  PackageCheck,
  Pencil,
  QrCode,
  ScanLine,
  Settings2,
  Trash2,
  Truck,
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

import { cancelRequest, updateRequestStatusByWarehouse, verifyRequest } from '../actions'
import { PickupQR } from './pickup-qr'
import { QRScannerDialog } from './qr-scanner-dialog'
import { RequestDialog, RoomOption, StockOption, WarehouseOption } from './request-dialog'

interface RequestItemData {
  consumableId: string
  quantity: number
}

interface RequestData {
  id: string
  requestCode: string
  status: string | null
  createdAt: Date | string | null
  itemCount: number
  requesterName: string | null
  roomName: string | null
  targetWarehouseId: string | null
  roomId: string
  items: RequestItemData[]
  description: string | null
  rejectionReason: string | null
}

interface RequestTableProps {
  data: RequestData[]
  userRole: string | null | undefined
  warehouses: WarehouseOption[]
  rooms: RoomOption[]
  stocks: StockOption[]
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

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  PENDING_UNIT: {
    label: 'Menunggu Unit',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    icon: Clock,
  },
  PENDING_FACULTY: {
    label: 'Menunggu Fakultas',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    icon: Clock,
  },
  APPROVED: {
    label: 'Disetujui',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: 'Diproses Gudang',
    className:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    icon: Package,
  },
  READY_TO_PICKUP: {
    label: 'Siap Diambil',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Selesai',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Ditolak',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
  },
  CANCELED: {
    label: 'Dibatalkan',
    className:
      'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700',
    icon: Ban,
  },
}

function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = status && status in STATUS_CONFIG ? status : 'PENDING_UNIT'
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

export function RequestTable({
  data,
  userRole,
  warehouses,
  rooms,
  stocks,
  metadata,
  currentSort,
  currentStatusFilter,
}: RequestTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pickupQrRequest, setPickupQrRequest] = useState<RequestData | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    status: true,
    date: true,
    requester: true,
    count: true,
    actions: true,
  })

  const itemToEdit = data.find((item) => item.id === editingId)

  const currentRole = userRole || ''
  const isUnitAdmin = currentRole === 'unit_admin'
  const isFacultyAdmin = currentRole === 'faculty_admin'
  const isStaff = currentRole === 'unit_staff'
  const isWarehouseStaff = currentRole === 'warehouse_staff'
  const isAdmin = isUnitAdmin || isFacultyAdmin

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
    const toastId = toast.loading('Membatalkan permintaan...')
    try {
      const res = await cancelRequest(deletingId)
      if (res.error) toast.error(res.error, { id: toastId })
      else {
        toast.success(res.message, { id: toastId })
        router.refresh()
      }
    } catch {
      toast.error('Gagal memproses permintaan', { id: toastId })
    } finally {
      setDeletingId(null)
    }
  }

  const handleApprove = async (id: string) => {
    const toastId = toast.loading('Memproses persetujuan (Cek Stok)...')
    try {
      const res = await verifyRequest(id, 'APPROVE')
      if (res.error) toast.error(res.error, { id: toastId, duration: 4000 })
      else {
        toast.success(res.message, { id: toastId })
        router.refresh()
      }
    } catch {
      toast.error('Gagal memproses persetujuan', { id: toastId })
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectId) return
    if (!rejectReason.trim()) {
      toast.error('Mohon isi alasan penolakan.')
      return
    }
    setIsProcessing(true)
    const toastId = toast.loading('Menolak permintaan...')
    try {
      const res = await verifyRequest(rejectId, 'REJECT', rejectReason)
      if (res.error) toast.error(res.error, { id: toastId })
      else {
        toast.success(res.message, { id: toastId })
        setRejectId(null)
        setRejectReason('')
        router.refresh()
      }
    } catch {
      toast.error('Gagal memproses penolakan', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWarehouseUpdate = async (id: string, newStatus: 'PROCESSING' | 'READY_TO_PICKUP') => {
    const label = newStatus === 'PROCESSING' ? 'Memproses pesanan...' : 'Menyiapkan pengambilan...'
    const toastId = toast.loading(label)
    try {
      const res = await updateRequestStatusByWarehouse(id, newStatus)
      if (res.error) toast.error(res.error, { id: toastId })
      else {
        toast.success(res.message, { id: toastId })
        router.refresh()
      }
    } catch {
      toast.error('Gagal update status gudang', { id: toastId })
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari kode / pemohon..." limit={metadata.itemsPerPage}>
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
                Request Info
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
              {(isAdmin || isWarehouseStaff) && (
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.requester}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, requester: c }))}
                >
                  Pemohon
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
                    id="code"
                    label="Request Info"
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
                {visibleColumns.requester && (isAdmin || isWarehouseStaff) && (
                  <SortableHeader
                    id="requester"
                    label="Pemohon"
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
                    Belum ada permintaan barang.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((req, index) => (
                  <TableRow key={req.id} className="group hover:bg-muted/50 border-b last:border-0">
                    <TableCell className="text-muted-foreground text-center text-xs">
                      {(metadata.currentPage - 1) * metadata.itemsPerPage + index + 1}
                    </TableCell>

                    {visibleColumns.description && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground line-clamp-2 text-sm font-semibold">
                            {req.description || 'Permintaan Barang'}
                          </span>
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <span className="bg-muted rounded px-1.5 py-0.5 font-mono">
                              {req.requestCode}
                            </span>
                            {req.roomName && <span>• {req.roomName}</span>}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell className="px-4 py-3">
                        <StatusBadge status={req.status} />
                      </TableCell>
                    )}

                    {visibleColumns.date && (
                      <TableCell className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                          <span>
                            {req.createdAt
                              ? format(new Date(req.createdAt), 'dd MMM yyyy', {
                                  locale: idLocale,
                                })
                              : '-'}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.requester && (isAdmin || isWarehouseStaff) && (
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="text-sm font-medium">{req.requesterName || '-'}</span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.count && (
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {req.itemCount} Item
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
                              href={`/dashboard/consumable-requests/${req.id}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                            </Link>
                          </DropdownMenuItem>

                          {isUnitAdmin && req.status === 'PENDING_UNIT' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(req.id)}
                                className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:text-green-400 dark:focus:bg-green-900/40"
                              >
                                <Check className="mr-2 h-4 w-4" /> Setujui
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectId(req.id)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/40"
                              >
                                <X className="mr-2 h-4 w-4" /> Tolak
                              </DropdownMenuItem>
                            </>
                          )}

                          {isFacultyAdmin && req.status === 'PENDING_FACULTY' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(req.id)}
                                className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:text-green-400"
                              >
                                <Check className="mr-2 h-4 w-4" /> Setujui Final
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectId(req.id)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400"
                              >
                                <X className="mr-2 h-4 w-4" /> Tolak
                              </DropdownMenuItem>
                            </>
                          )}

                          {isWarehouseStaff && (
                            <>
                              {req.status === 'APPROVED' && (
                                <DropdownMenuItem
                                  onClick={() => handleWarehouseUpdate(req.id, 'PROCESSING')}
                                  className="text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400"
                                >
                                  <Box className="mr-2 h-4 w-4" /> Mulai Packing
                                </DropdownMenuItem>
                              )}
                              {req.status === 'PROCESSING' && (
                                <DropdownMenuItem
                                  onClick={() => handleWarehouseUpdate(req.id, 'READY_TO_PICKUP')}
                                  className="text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400"
                                >
                                  <PackageCheck className="mr-2 h-4 w-4" /> Siap Diambil
                                </DropdownMenuItem>
                              )}
                              {req.status === 'READY_TO_PICKUP' && (
                                <DropdownMenuItem
                                  onClick={() => setIsScannerOpen(true)}
                                  className="text-blue-600 focus:bg-blue-50 dark:text-blue-400"
                                >
                                  <ScanLine className="mr-2 h-4 w-4" /> Scan QR User
                                </DropdownMenuItem>
                              )}
                            </>
                          )}

                          {isStaff && (
                            <>
                              {(req.status === 'PENDING_UNIT' || req.status === 'REJECTED') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setEditingId(req.id)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingId(req.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                  </DropdownMenuItem>
                                </>
                              )}
                              {req.status === 'READY_TO_PICKUP' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setPickupQrRequest(req)}
                                    className="text-blue-600 focus:bg-blue-50 dark:text-blue-400"
                                  >
                                    <QrCode className="mr-2 h-4 w-4" /> Tunjukkan QR
                                  </DropdownMenuItem>
                                </>
                              )}
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

      {isStaff && editingId && itemToEdit && (
        <RequestDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          warehouses={warehouses}
          rooms={rooms}
          stocks={stocks}
          initialData={{
            id: itemToEdit.id,
            targetWarehouseId: itemToEdit.targetWarehouseId || '',
            roomId: itemToEdit.roomId,
            description: itemToEdit.description || '',
            items: itemToEdit.items,
          }}
          trigger={<span className="hidden"></span>}
        />
      )}

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menolak permintaan ini? Silakan berikan alasannya.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-2 block text-sm font-medium">Alasan Penolakan</label>
            <Textarea
              placeholder="Contoh: Stok menipis, atau bukan prioritas saat ini."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-25"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)} disabled={isProcessing}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? 'Memproses...' : 'Tolak Permintaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Permintaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan permintaan ini? Data akan dihapus permanen.
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

      {pickupQrRequest && (
        <PickupQR
          open={!!pickupQrRequest}
          onOpenChange={(open) => !open && setPickupQrRequest(null)}
          requestId={pickupQrRequest.id}
          requestCode={pickupQrRequest.requestCode}
        />
      )}

      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={() => {}}
      />
    </div>
  )
}

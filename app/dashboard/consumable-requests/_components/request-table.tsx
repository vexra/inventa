'use client'

import { useState } from 'react'

import Link from 'next/link'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  AlertCircle,
  Ban,
  Box,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  type LucideIcon,
  MoreHorizontal,
  Package,
  PackageCheck,
  Pencil,
  QrCode,
  ScanLine,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { requestStatusEnum } from '@/db/schema'

import { cancelRequest, updateRequestStatusByWarehouse, verifyRequest } from '../actions'
import { PickupQR } from './pickup-qr'
import { QRScannerDialog } from './qr-scanner-dialog'
import { RequestDialog, RoomOption, StockOption, WarehouseOption } from './request-dialog'

type RequestStatus = (typeof requestStatusEnum.enumValues)[number]

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
}

export function RequestTable({ data, userRole, warehouses, rooms, stocks }: RequestTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const [pickupQrRequest, setPickupQrRequest] = useState<RequestData | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const itemToEdit = data.find((item) => item.id === editingId)

  const currentRole = userRole || ''
  const isUnitAdmin = currentRole === 'unit_admin'
  const isFacultyAdmin = currentRole === 'faculty_admin'
  const isStaff = currentRole === 'unit_staff'
  const isWarehouseStaff = currentRole === 'warehouse_staff'
  const isAdmin = isUnitAdmin || isFacultyAdmin

  const handleDelete = async () => {
    if (!deletingId) return
    const toastId = toast.loading('Membatalkan permintaan...')
    try {
      const res = await cancelRequest(deletingId)
      if (res.error) {
        toast.error(res.error, { id: toastId })
      } else {
        toast.success(res.message, { id: toastId })
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
      if (res.error) {
        toast.error(res.error, { id: toastId, duration: 4000 })
      } else {
        toast.success(res.message, { id: toastId })
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
      if (res.error) {
        toast.error(res.error, { id: toastId })
      } else {
        toast.success(res.message, { id: toastId })
        setRejectId(null)
        setRejectReason('')
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
      if (res.error) {
        toast.error(res.error, { id: toastId })
      } else {
        toast.success(res.message, { id: toastId })
      }
    } catch {
      toast.error('Gagal update status gudang', { id: toastId })
    }
  }

  return (
    <>
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-45">Request Info</TableHead>
              <TableHead className="w-50">Status</TableHead>
              <TableHead>Tanggal</TableHead>
              {(isAdmin || isWarehouseStaff) && <TableHead>Pemohon</TableHead>}
              <TableHead className="text-center">Total Item</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin || isWarehouseStaff ? 7 : 6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Belum ada permintaan barang.
                </TableCell>
              </TableRow>
            ) : (
              data.map((req, index) => (
                <TableRow key={req.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 text-sm font-semibold">
                        {req.description || 'Permintaan Barang'}
                      </span>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span className="font-mono">{req.requestCode}</span>
                        {req.roomName && <span>• Ruang: {req.roomName}</span>}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={req.status as RequestStatus} />
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="flex items-start gap-1.5 rounded bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-2 max-w-45" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-sm">
                        {req.createdAt
                          ? format(new Date(req.createdAt), 'dd MMM yyyy', {
                              locale: idLocale,
                            })
                          : '-'}
                      </span>
                    </div>
                  </TableCell>

                  {(isAdmin || isWarehouseStaff) && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{req.requesterName || '-'}</span>
                      </div>
                    </TableCell>
                  )}

                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {req.itemCount} Item
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary h-8 w-8"
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

                        {/* ======================= */}
                        {/* ROLE: UNIT ADMIN ACTIONS */}
                        {/* ======================= */}
                        {isUnitAdmin && req.status === 'PENDING_UNIT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApprove(req.id)}
                              className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:text-green-400 dark:focus:bg-green-900/40 dark:focus:text-green-300"
                            >
                              <Check className="mr-2 h-4 w-4" /> Setujui
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRejectId(req.id)}
                              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/40 dark:focus:text-red-300"
                            >
                              <X className="mr-2 h-4 w-4" /> Tolak
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* ========================== */}
                        {/* ROLE: FACULTY ADMIN ACTIONS */}
                        {/* ========================== */}
                        {isFacultyAdmin && req.status === 'PENDING_FACULTY' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleApprove(req.id)}
                              className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:text-green-400 dark:focus:bg-green-900/40 dark:focus:text-green-300"
                            >
                              <Check className="mr-2 h-4 w-4" /> Setujui Final
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRejectId(req.id)}
                              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/40 dark:focus:text-red-300"
                            >
                              <X className="mr-2 h-4 w-4" /> Tolak
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* =========================== */}
                        {/* ROLE: WAREHOUSE STAFF ACTIONS */}
                        {/* =========================== */}
                        {isWarehouseStaff && (
                          <>
                            {req.status === 'APPROVED' && (
                              <DropdownMenuItem
                                onClick={() => handleWarehouseUpdate(req.id, 'PROCESSING')}
                                className="text-indigo-600 focus:bg-indigo-50 dark:text-indigo-400 dark:focus:bg-indigo-900/40 dark:focus:text-indigo-300"
                              >
                                <Box className="mr-2 h-4 w-4" /> Mulai Packing
                              </DropdownMenuItem>
                            )}

                            {req.status === 'PROCESSING' && (
                              <DropdownMenuItem
                                onClick={() => handleWarehouseUpdate(req.id, 'READY_TO_PICKUP')}
                                className="text-emerald-600 focus:bg-emerald-50 dark:text-emerald-400 dark:focus:bg-emerald-900/40 dark:focus:text-emerald-300"
                              >
                                <PackageCheck className="mr-2 h-4 w-4" /> Siap Diambil
                              </DropdownMenuItem>
                            )}

                            {/* WAREHOUSE: SCAN QR USER (VERIFIKASI) */}
                            {req.status === 'READY_TO_PICKUP' && (
                              <DropdownMenuItem
                                onClick={() => setIsScannerOpen(true)}
                                className="text-blue-600 focus:bg-blue-50 dark:text-blue-400 dark:focus:bg-blue-900/40 dark:focus:text-blue-300"
                              >
                                <ScanLine className="mr-2 h-4 w-4" /> Scan QR User
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* ======================= */}
                        {/* ROLE: UNIT STAFF (REQUESTER) ACTIONS */}
                        {/* ======================= */}
                        {/* Perbaikan: Menggunakan isStaff, BUKAN isUnitUser (yg juga include Admin) */}
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
                                  className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20"
                                >
                                  <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" />
                                  Hapus
                                </DropdownMenuItem>
                              </>
                            )}

                            {req.status === 'READY_TO_PICKUP' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setPickupQrRequest(req)}
                                  className="text-blue-600 focus:bg-blue-50 dark:text-blue-400 dark:focus:bg-blue-900/40 dark:focus:text-blue-300"
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

      {/* --- DIALOGS --- */}

      {/* Dialog Edit (Staff) */}
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

      {/* Dialog Reject (Admin) */}
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

      {/* Dialog Delete (Staff) */}
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

      {/* [NEW] Dialog QR Code untuk Unit Staff */}
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
    </>
  )
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string; icon: LucideIcon }> =
  {
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

function StatusBadge({ status }: { status: RequestStatus | string | null }) {
  const normalizedStatus = (
    status && status in STATUS_CONFIG ? status : 'PENDING_UNIT'
  ) as RequestStatus
  const config = STATUS_CONFIG[normalizedStatus]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`gap-1 font-normal ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

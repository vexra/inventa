'use client'

import { useState } from 'react'

import Link from 'next/link'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  type LucideIcon,
  MoreHorizontal,
  Package,
  Pencil,
  Trash2,
  Truck,
  User,
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
import { requestStatusEnum } from '@/db/schema'

import { cancelRequest } from '../actions'
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
  notes: string | null
  items: RequestItemData[]
}

interface RequestTableProps {
  data: RequestData[]
  isUnitAdmin: boolean
  warehouses: WarehouseOption[]
  rooms: RoomOption[]
  stocks: StockOption[]
}

export function RequestTable({ data, isUnitAdmin, warehouses, rooms, stocks }: RequestTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const itemToEdit = data.find((item) => item.id === editingId)

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
              {isUnitAdmin && <TableHead>Pemohon</TableHead>}
              <TableHead className="text-center">Total Item</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isUnitAdmin ? 7 : 6}
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
                      <span className="text-sm font-semibold">Permintaan Barang</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {req.requestCode}
                      </span>
                      {req.roomName && (
                        <span className="text-muted-foreground text-xs">Ruang: {req.roomName}</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={req.status as RequestStatus} />
                      {/* Tampilkan notes jika ditolak (opsional, jika backend kirim notes reject) */}
                      {req.status === 'REJECTED' && req.notes && (
                        <div className="flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="max-w-37.5 truncate" title={req.notes}>
                            {req.notes}
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

                  {isUnitAdmin && (
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

                        {req.status === 'PENDING_UNIT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingId(req.id)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingId(req.id)}
                              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20"
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" />{' '}
                              Batalkan
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

      {/* Dialog Edit */}
      {editingId && itemToEdit && (
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
            notes: itemToEdit.notes || '',
            items: itemToEdit.items,
          }}
          trigger={<span className="hidden"></span>}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Permintaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan permintaan ini? Data akan dihapus permanen dan
              tidak dapat dikembalikan.
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
    </>
  )
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string; icon: LucideIcon }> =
  {
    PENDING_UNIT: {
      label: 'Menunggu Admin Unit',
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

'use client'

import { useState } from 'react'

import Link from 'next/link'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar, Check, Eye, MoreHorizontal, PackageCheck, Pencil, Trash2, X } from 'lucide-react'
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
import { procurementStatusEnum } from '@/db/schema'

import { deleteProcurement, verifyProcurement } from '../actions'
import { ProcurementDialog } from './procurement-dialog'
import { ReceiveDialog } from './receive-dialog'

type ProcurementStatus = (typeof procurementStatusEnum.enumValues)[number]

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
}

export function ProcurementTable({ data, consumables, userRole }: ProcurementTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectLoading, setIsRejectLoading] = useState(false)

  const itemToEdit = data.find((item) => item.id === editingId)
  const itemToReceive = data.find((item) => item.id === receivingId)
  const showRequesterColumn = userRole === 'faculty_admin' || userRole === 'super_admin'

  const handleDelete = async () => {
    if (!deletingId) return
    const toastId = toast.loading('Membatalkan pengajuan...')
    try {
      const result = await deleteProcurement(deletingId)
      if (result.success) {
        toast.success(result.message, { id: toastId })
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
      else toast.success(res.message, { id: toastId })
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
      }
    } catch {
      toast.error('Gagal memproses', { id: toastId })
    } finally {
      setIsRejectLoading(false)
    }
  }

  return (
    <>
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="min-w-50">Pengajuan</TableHead>
              <TableHead className="w-45">Status</TableHead>
              <TableHead>Tanggal</TableHead>
              {showRequesterColumn && <TableHead>Diajukan Oleh</TableHead>}
              <TableHead className="text-center">Total Item</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showRequesterColumn ? 7 : 6}
                  className="text-muted-foreground h-24 text-center"
                >
                  Belum ada pengajuan pengadaan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 text-sm font-semibold">
                        {item.description || 'Tanpa Judul'}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">{item.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status as ProcurementStatus} />
                  </TableCell>
                  <TableCell>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-sm">
                        {item.requestDate
                          ? format(new Date(item.requestDate), 'dd MMM yyyy', {
                              locale: idLocale,
                            })
                          : '-'}
                      </span>
                    </div>
                  </TableCell>
                  {showRequesterColumn && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.requester?.name || '-'}</span>
                        <span className="text-muted-foreground text-xs">Staff Gudang</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {item.items.length} Barang
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
                                className="text-green-600 focus:bg-green-50 focus:text-green-700 dark:focus:bg-green-900/20"
                              >
                                <Check className="mr-2 h-4 w-4" /> Setujui
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectId(item.id)}
                                className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20"
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
                                className="text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-900/20"
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
                              className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20"
                            >
                              <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" />{' '}
                              Hapus
                            </DropdownMenuItem>
                          </>
                        )}
                        {(userRole === 'warehouse_staff' || userRole === 'super_admin') &&
                          item.status === 'REJECTED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setEditingId(item.id)}
                                className="text-orange-600 focus:bg-orange-50 focus:text-orange-700 dark:focus:bg-orange-900/20"
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
    </>
  )
}

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Menunggu',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  APPROVED: {
    label: 'Disetujui',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  REJECTED: {
    label: 'Ditolak',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
  COMPLETED: {
    label: 'Selesai',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
}

function StatusBadge({ status }: { status: ProcurementStatus | string | null }) {
  const normalizedStatus = (
    status && status in STATUS_CONFIG ? status : 'PENDING'
  ) as ProcurementStatus
  const config = STATUS_CONFIG[normalizedStatus]
  return (
    <Badge variant="outline" className={`font-normal ${config.className}`}>
      {config.label}
    </Badge>
  )
}

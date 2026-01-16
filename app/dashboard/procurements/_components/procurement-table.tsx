'use client'

import { useState } from 'react'

import Link from 'next/link'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar, Eye, MoreHorizontal, PackageCheck, Pencil, Trash2 } from 'lucide-react'
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
import { procurementStatusEnum } from '@/db/schema'

import { deleteProcurement } from '../actions'
import { ProcurementDialog } from './procurement-dialog'
import { ReceiveDialog } from './receive-dialog'

type ProcurementStatus = (typeof procurementStatusEnum.enumValues)[number]

interface ProcurementData {
  id: string
  code: string
  status: string | null
  requestDate: Date | null
  notes: string | null
  requester: { name: string | null } | null
  items: {
    id: string
    consumableId: string
    consumableName: string | null
    unit: string | null
    quantity: string | number
  }[]
}

interface ConsumableOption {
  id: string
  name: string
  unit: string
}

interface ProcurementTableProps {
  data: ProcurementData[]
  consumables: ConsumableOption[]
}

export function ProcurementTable({ data, consumables }: ProcurementTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [receivingId, setReceivingId] = useState<string | null>(null)

  const itemToEdit = data.find((item) => item.id === editingId)

  const itemToReceive = data.find((item) => item.id === receivingId)

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

  return (
    <>
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12.5">#</TableHead>
              <TableHead>Kode & Status</TableHead>
              <TableHead>Tanggal Pengajuan</TableHead>
              <TableHead>Diajukan Oleh</TableHead>
              <TableHead className="text-center">Total Item</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  Belum ada pengajuan pengadaan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono font-medium">{item.code}</span>
                      <div className="flex">
                        <StatusBadge status={item.status as ProcurementStatus} />
                      </div>
                    </div>
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
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.requester?.name || '-'}</span>
                      <span className="text-muted-foreground text-xs">Staff Gudang</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {item.items.length} Barang
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
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

                        {item.status === 'APPROVED' && (
                          <DropdownMenuItem onClick={() => setReceivingId(item.id)}>
                            <PackageCheck className="mr-2 h-4 w-4" /> Terima Barang
                          </DropdownMenuItem>
                        )}

                        {item.status === 'PENDING' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingId(item.id)}
                              className="text-red-600 focus:text-red-600"
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
            items: itemToEdit.items.map((i) => ({
              consumableId: i.consumableId,
              quantity: Number(i.quantity),
            })),
          }}
          trigger={<span className="hidden"></span>}
        />
      )}

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
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
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

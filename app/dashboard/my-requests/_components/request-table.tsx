'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Ban, CheckCircle2, Clock, type LucideIcon, Package, Truck, XCircle } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

type RequestStatus = (typeof requestStatusEnum.enumValues)[number]

interface RequestData {
  id: string
  requestCode: string
  status: string | null
  createdAt: Date | string | null
  itemCount: number
}

const STATUS_MAP: Record<RequestStatus, { label: string; color: string; icon: LucideIcon }> = {
  PENDING_UNIT: {
    label: 'Menunggu Admin Unit',
    color:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    icon: Clock,
  },
  PENDING_FACULTY: {
    label: 'Menunggu Fakultas',
    color:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    icon: Clock,
  },
  APPROVED: {
    label: 'Disetujui',
    color:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: 'Sedang Disiapkan',
    color:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    icon: Package,
  },
  READY_TO_PICKUP: {
    label: 'Siap Diambil',
    color:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Selesai',
    color:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Ditolak',
    color:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
  },
  CANCELED: {
    label: 'Dibatalkan',
    color:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    icon: Ban,
  },
}

interface RequestTableProps {
  data: RequestData[]
}

export function RequestTable({ data }: RequestTableProps) {
  const handleCancel = async (id: string) => {
    const res = await cancelRequest(id)
    if (res.success) {
      toast.success(res.message)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. Request</TableHead>
            <TableHead>Jumlah Barang</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                Belum ada permintaan.
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => {
              const statusKey = req.status as RequestStatus
              const statusConfig = STATUS_MAP[statusKey] || STATUS_MAP['PENDING_UNIT']
              const StatusIcon = statusConfig.icon
              const createdDate = req.createdAt ? new Date(req.createdAt) : new Date()

              return (
                <TableRow key={req.id}>
                  <TableCell>
                    {format(createdDate, 'dd MMM yyyy', { locale: idLocale })}
                    <div className="text-muted-foreground text-xs">
                      {format(createdDate, 'HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-medium">{req.requestCode}</span>
                  </TableCell>

                  <TableCell>{req.itemCount} Item</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {statusKey === 'PENDING_UNIT' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                          >
                            Batalkan
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Batalkan Permintaan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permintaan ini akan dihapus permanen. Tindakan ini tidak bisa
                              dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Kembali</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancel(req.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Ya, Batalkan
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

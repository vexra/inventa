'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Ban,
  CheckCircle2,
  Clock,
  type LucideIcon,
  MapPin,
  Package,
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
  requesterName: string | null
  roomName: string | null
}

interface RequestTableProps {
  data: RequestData[]
  isUnitAdmin: boolean
}

const STATUS_MAP: Record<RequestStatus, { label: string; color: string; icon: LucideIcon }> = {
  PENDING_UNIT: {
    label: 'Menunggu Admin Unit',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  PENDING_FACULTY: {
    label: 'Menunggu Fakultas',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: Clock,
  },
  APPROVED: {
    label: 'Disetujui',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: 'Diproses Gudang',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: Package,
  },
  READY_TO_PICKUP: {
    label: 'Siap Diambil',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: Truck,
  },
  COMPLETED: {
    label: 'Selesai',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Ditolak',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  CANCELED: {
    label: 'Dibatalkan',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    icon: Ban,
  },
}

export function RequestTable({ data, isUnitAdmin }: RequestTableProps) {
  async function handleCancel(id: string) {
    const res = await cancelRequest(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
    }
  }

  return (
    <div className="bg-card rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode Request</TableHead>
            {isUnitAdmin && <TableHead>Pemohon</TableHead>}
            <TableHead>Ruangan</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Jml Item</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isUnitAdmin ? 7 : 6}
                className="text-muted-foreground h-24 text-center"
              >
                Belum ada permintaan.
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => {
              const statusConfig = req.status
                ? STATUS_MAP[req.status as RequestStatus]
                : STATUS_MAP['PENDING_UNIT']
              const StatusIcon = statusConfig.icon

              return (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs font-medium">{req.requestCode}</TableCell>

                  {isUnitAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="text-muted-foreground h-3 w-3" />
                        <span className="text-sm font-medium">{req.requesterName}</span>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="text-muted-foreground h-3 w-3" />
                      <span className="text-sm">{req.roomName}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-sm">
                    {req.createdAt
                      ? format(new Date(req.createdAt), 'dd MMM yyyy', { locale: idLocale })
                      : '-'}
                  </TableCell>
                  <TableCell>{req.itemCount} Barang</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`flex w-fit items-center gap-1 font-normal ${statusConfig.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING_UNIT' && (
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

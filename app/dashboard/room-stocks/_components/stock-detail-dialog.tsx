'use client'

import { useMemo } from 'react'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { MapPin, Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface BatchItem {
  id: string
  batch: string | null
  qty: number
  exp: string | null
  roomName: string
}

interface StockDetailDialogProps {
  itemName: string
  unit: string
  batches: BatchItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StockDetailDialog({
  itemName,
  unit,
  batches,
  open,
  onOpenChange,
}: StockDetailDialogProps) {
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      const isZeroA = a.qty <= 0
      const isZeroB = b.qty <= 0

      if (isZeroA && !isZeroB) return 1
      if (!isZeroA && isZeroB) return -1

      const dateA = a.exp ? new Date(a.exp).getTime() : Infinity
      const dateB = b.exp ? new Date(b.exp).getTime() : Infinity

      return dateA - dateB
    })
  }, [batches])

  const getBatchStatus = (qty: number, expDate: string | null) => {
    if (qty <= 0) return 'empty'
    if (!expDate) return 'no-exp'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exp = new Date(expDate)
    exp.setHours(0, 0, 0, 0)

    const diffTime = exp.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'expired'
    if (diffDays <= 90) return 'warning'
    return 'ok'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Package className="text-primary h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{itemName}</DialogTitle>
              <DialogDescription>Rincian ketersediaan stok di seluruh ruangan.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>No. Batch</TableHead>
                <TableHead>Lokasi Ruangan</TableHead>
                <TableHead>Tgl. Kadaluarsa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Tidak ada data batch untuk item ini.
                  </TableCell>
                </TableRow>
              ) : (
                sortedBatches.map((batch) => {
                  const status = getBatchStatus(batch.qty, batch.exp)
                  const isZero = batch.qty <= 0

                  const rowClass =
                    status === 'expired'
                      ? 'bg-red-50 dark:bg-red-900/10'
                      : status === 'empty'
                        ? 'text-muted-foreground bg-muted/30'
                        : ''

                  return (
                    <TableRow key={batch.id} className={rowClass}>
                      <TableCell className="font-medium">
                        {batch.batch || '-'}
                        <div className="text-muted-foreground mt-1 block text-xs md:hidden">
                          {batch.roomName}
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="max-w-37.5 truncate" title={batch.roomName}>
                            {batch.roomName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {batch.exp
                          ? format(new Date(batch.exp), 'dd MMM yyyy', { locale: idLocale })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {status === 'expired' && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            Expired
                          </Badge>
                        )}
                        {status === 'warning' && (
                          <Badge
                            variant="secondary"
                            className="h-5 border border-orange-200 bg-orange-100 px-1.5 text-[10px] text-orange-800 hover:bg-orange-200 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                          >
                            Exp. Dekat
                          </Badge>
                        )}
                        {status === 'ok' && (
                          <Badge
                            variant="outline"
                            className="h-5 border-green-500 bg-green-50 px-1.5 text-[10px] text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                          >
                            Baik
                          </Badge>
                        )}
                        {status === 'empty' && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] opacity-50">
                            Habis
                          </Badge>
                        )}
                        {status === 'no-exp' && !isZero && (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {batch.qty} {unit}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

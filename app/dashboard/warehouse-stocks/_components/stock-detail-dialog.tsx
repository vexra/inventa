'use client'

import { useMemo } from 'react'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
}

interface StockDetailDialogProps {
  itemName: string
  unit: string
  batches: BatchItem[]
  children: React.ReactNode
}

export function StockDetailDialog({ itemName, unit, batches, children }: StockDetailDialogProps) {
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      const isZeroA = a.qty <= 0
      const isZeroB = b.qty <= 0

      if (isZeroA !== isZeroB) {
        return isZeroA ? 1 : -1
      }

      const dateA = a.exp ? new Date(a.exp).getTime() : Infinity
      const dateB = b.exp ? new Date(b.exp).getTime() : Infinity

      return dateA - dateB
    })
  }, [batches])

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Detail Stok: {itemName}
          </DialogTitle>
          <DialogDescription>
            Rincian batch dan tanggal kadaluarsa untuk item ini.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-4 max-h-[60vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>No. Batch</TableHead>
                <TableHead className="text-center">Kadaluarsa</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    Tidak ada data batch.
                  </TableCell>
                </TableRow>
              ) : (
                sortedBatches.map((batch, index) => {
                  const expDate = batch.exp ? new Date(batch.exp) : null
                  const now = new Date()
                  const isZero = batch.qty <= 0 // Cek apakah stok habis
                  let status: 'expired' | 'warning' | 'ok' | 'empty' | 'no-exp' = 'no-exp'

                  if (isZero) {
                    status = 'empty'
                  } else if (expDate) {
                    const cleanExp = new Date(expDate.setHours(0, 0, 0, 0))
                    const cleanNow = new Date(now.setHours(0, 0, 0, 0))

                    const diffTime = cleanExp.getTime() - cleanNow.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                    if (diffTime < 0) status = 'expired'
                    else if (diffDays <= 90) status = 'warning'
                    else status = 'ok'
                  }

                  return (
                    <TableRow
                      key={index}
                      className={` ${status === 'expired' ? 'bg-red-50 dark:bg-red-900/10' : ''} ${status === 'empty' ? 'bg-muted/50 text-muted-foreground opacity-60' : ''} `}
                    >
                      <TableCell className="font-mono font-medium">
                        {batch.batch || '-'}
                        {status === 'empty' && (
                          <span className="ml-2 text-[10px] italic">(Habis)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {expDate ? format(expDate, 'd MMM yyyy', { locale: idLocale }) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {batch.qty} {unit}
                      </TableCell>
                      <TableCell className="text-center">
                        {status === 'empty' && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            Habis
                          </Badge>
                        )}
                        {status === 'expired' && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            Expired
                          </Badge>
                        )}
                        {status === 'warning' && (
                          <Badge
                            variant="outline"
                            className="h-5 border-yellow-500 bg-yellow-50 px-1.5 text-[10px] text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                          >
                            Exp. Dekat
                          </Badge>
                        )}
                        {status === 'ok' && (
                          <Badge
                            variant="outline"
                            className="h-5 border-green-500 bg-green-50 px-1.5 text-[10px] text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                          >
                            Oke
                          </Badge>
                        )}
                        {status === 'no-exp' && !isZero && (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
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

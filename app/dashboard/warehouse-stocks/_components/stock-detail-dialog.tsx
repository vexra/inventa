'use client'

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
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Detail Stok: {itemName}
          </DialogTitle>
          <DialogDescription>
            Rincian batch dan tanggal kadaluarsa untuk item ini.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Batch</TableHead>
                <TableHead className="text-center">Kadaluarsa</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    Tidak ada data batch aktif.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch, index) => {
                  const expDate = batch.exp ? new Date(batch.exp) : null
                  const now = new Date()
                  let status: 'expired' | 'warning' | 'ok' | 'no-exp' = 'no-exp'

                  if (expDate) {
                    const diffTime = expDate.getTime() - now.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                    if (diffDays <= 0) status = 'expired'
                    else if (diffDays <= 90) status = 'warning'
                    else status = 'ok'
                  }

                  return (
                    <TableRow
                      key={index}
                      className={status === 'expired' ? 'bg-red-50 dark:bg-red-900/10' : ''}
                    >
                      <TableCell className="font-mono font-medium">{batch.batch || '-'}</TableCell>
                      <TableCell className="text-center">
                        {expDate ? format(expDate, 'd MMM yyyy', { locale: idLocale }) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {batch.qty} {unit}
                      </TableCell>
                      <TableCell className="text-center">
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
                        {status === 'no-exp' && (
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

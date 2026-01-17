'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Box, CalendarClock, PackageOpen } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RoomStockData {
  id: string
  quantity: string | number
  updatedAt: Date | null
  consumable: {
    name: string
    sku: string | null
    unit: string
  }
  category: {
    name: string
  } | null
}

interface StockTableProps {
  data: RoomStockData[]
}

export function StockTable({ data }: StockTableProps) {
  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-75">Barang</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Sisa Stok</TableHead>
            <TableHead>Satuan</TableHead>
            <TableHead className="text-right">Update Terakhir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <PackageOpen className="h-8 w-8 opacity-50" />
                  <p>Tidak ada stok barang di ruangan ini.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.consumable.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {item.consumable.sku || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="font-normal text-zinc-600 dark:text-zinc-400"
                  >
                    {item.category?.name || 'Uncategorized'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 font-mono text-base font-semibold text-blue-600 dark:text-blue-400">
                    <Box className="h-4 w-4" />
                    {Number(item.quantity)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.consumable.unit}</TableCell>
                <TableCell className="text-muted-foreground text-right text-sm">
                  {item.updatedAt ? (
                    <div
                      className="flex items-center justify-end gap-1"
                      title={format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm')}
                    >
                      <span>
                        {format(new Date(item.updatedAt), 'dd MMM yyyy', { locale: idLocale })}
                      </span>
                      <CalendarClock className="h-3 w-3" />
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

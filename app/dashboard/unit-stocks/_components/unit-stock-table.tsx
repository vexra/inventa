'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { AlertTriangle, Box, CalendarClock, MapPin, PackageOpen } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UnitStockData {
  id: string
  quantity: string | number
  updatedAt: Date | null
  roomName: string // Kolom Penting
  consumable: {
    name: string
    sku: string | null
    unit: string
    minimumStock: number | null
  }
  category: {
    name: string
  } | null
}

export function UnitStockTable({ data }: { data: UnitStockData[] }) {
  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-62.5">Barang</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Lokasi</TableHead>
            <TableHead>Sisa Stok</TableHead>
            <TableHead className="text-right">Update Terakhir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <PackageOpen className="h-8 w-8 opacity-50" />
                  <p>Tidak ada stok barang yang ditemukan.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const qty = Number(item.quantity)
              const minStock = item.consumable.minimumStock || 0
              const isLow = qty <= minStock

              return (
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
                    <Badge variant="secondary" className="font-normal">
                      {item.category?.name || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                      {item.roomName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-2 font-mono text-base font-semibold ${
                          isLow ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <Box className="h-4 w-4" />
                        {qty}
                      </div>
                      <span className="text-muted-foreground text-sm">{item.consumable.unit}</span>
                      {isLow && (
                        <div title={`Stok di bawah batas minimum (${minStock})`}>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-sm">
                    {item.updatedAt ? (
                      <div className="flex items-center justify-end gap-1">
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
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

'use client'

import { useState } from 'react'

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { StockDetailDialog } from './stock-detail-dialog'

interface BatchData {
  id: string
  batch: string | null
  qty: number
  exp: string | null
}

interface StockItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  totalQuantity: number
  unit: string
  minimumStock: number | null
  status: 'OUT' | 'LOW' | 'SAFE'
  hasExpired: boolean
  hasNearExpiry: boolean
  batches: BatchData[]
}

interface StockTableProps {
  data: StockItem[]
}

export function StockTable({ data }: StockTableProps) {
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-75">Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Status Stok</TableHead>
              <TableHead className="text-center">Kondisi (QC)</TableHead>
              <TableHead className="text-right">Total Stok</TableHead>
              <TableHead className="text-right">Min. Stok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  Tidak ada barang yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {item.sku || '-'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">{item.category || '-'}</TableCell>

                  <TableCell className="text-center">
                    {item.status === 'OUT' ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Habis
                      </Badge>
                    ) : item.status === 'LOW' ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                      >
                        <AlertTriangle className="h-3 w-3" /> Menipis
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Aman
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {item.hasExpired ? (
                      <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                        Expired
                      </Badge>
                    ) : item.hasNearExpiry ? (
                      <Badge
                        variant="secondary"
                        className="h-5 border border-orange-200 bg-orange-100 px-2 text-[10px] text-orange-800 hover:bg-orange-200 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      >
                        Exp. Dekat
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 border-green-500 bg-green-50 px-2 text-[10px] text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Baik
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.totalQuantity}
                    </span>{' '}
                    <span className="text-muted-foreground text-xs">{item.unit}</span>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-right text-sm">
                    {item.minimumStock ?? '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground mt-2 text-right text-xs italic">
        * Klik pada baris barang untuk melihat detail.
      </div>

      <StockDetailDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        itemName={selectedItem?.name || ''}
        unit={selectedItem?.unit || ''}
        batches={selectedItem?.batches || []}
      />
    </>
  )
}

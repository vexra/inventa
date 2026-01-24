'use client'

import { useState } from 'react'

import { Layers, Package } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { AdjustmentDialog } from './adjustment-dialog'

interface AggregatedStock {
  consumableId: string
  consumableName: string
  categoryName: string | null
  unit: string
  totalQuantity: number
  batchCount: number
  batches: {
    id: string
    batchNumber: string | null
    quantity: number
    expiryDate: Date | null
  }[]
}

interface StockTableProps {
  data: AggregatedStock[]
}

export function StockTable({ data }: StockTableProps) {
  const [selectedItem, setSelectedItem] = useState<AggregatedStock | null>(null)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Jumlah Batch</TableHead>
              <TableHead className="text-right">Total Stok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="h-8 w-8 opacity-20" />
                    <p>Tidak ada data stok ditemukan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.consumableId}
                  onClick={() => setSelectedItem(item)}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {item.consumableName}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {item.categoryName || '-'}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1 font-mono font-normal">
                      <Layers className="h-3 w-3" />
                      {item.batchCount}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.totalQuantity}
                    </span>{' '}
                    <span className="text-muted-foreground text-xs">{item.unit}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground mt-2 text-right text-xs italic">
        * Klik pada baris barang untuk melakukan Opname.
      </div>

      {selectedItem && (
        <AdjustmentDialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          consumableId={selectedItem.consumableId}
          consumableName={selectedItem.consumableName}
          unit={selectedItem.unit}
          batches={selectedItem.batches}
        />
      )}
    </>
  )
}

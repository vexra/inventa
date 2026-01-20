'use client'

import { useState } from 'react'

import { PackageOpen, Scale } from 'lucide-react'

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

import { AdjustmentDialog } from './adjustment-dialog'

// Interface Data yang sudah di-Group per Item
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
      <div className="bg-card overflow-hidden rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Jml. Batch</TableHead>
              <TableHead className="text-right">Total Stok</TableHead>
              <TableHead className="w-35 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <PackageOpen className="h-8 w-8 opacity-50" />
                    <p>Belum ada stok barang di gudang ini.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.consumableId} className="hover:bg-muted/5">
                  <TableCell className="text-muted-foreground text-center">{index + 1}</TableCell>
                  <TableCell>
                    <span className="text-base font-medium">{item.consumableName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {item.categoryName || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground bg-muted rounded-full px-2 py-1 text-xs">
                      {item.batchCount} Batch
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-mono text-lg font-bold">{item.totalQuantity}</span>
                      <span className="text-muted-foreground text-xs">{item.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                      className="gap-2 border shadow-sm"
                    >
                      <Scale className="h-4 w-4" />
                      Opname
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

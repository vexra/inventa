'use client'

import { useState } from 'react'

import { format } from 'date-fns'
import { Scale } from 'lucide-react'

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

interface StockData {
  id: string
  consumableId: string
  consumableName: string
  categoryName: string | null
  unit: string
  quantity: number
  batchNumber: string | null
  expiryDate: Date | null
}

interface StockTableProps {
  data: StockData[]
}

export function StockTable({ data }: StockTableProps) {
  const [selectedItem, setSelectedItem] = useState<StockData | null>(null)

  return (
    <>
      <div className="bg-card rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Batch / Expired</TableHead>
              <TableHead className="text-right">Stok Sistem</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                  Belum ada data stok di gudang.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.consumableName}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.categoryName || 'Tanpa Kategori'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-10 text-xs font-bold uppercase">
                          Batch
                        </span>
                        <span className="bg-muted rounded px-1 font-mono">
                          {item.batchNumber || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-10 text-xs font-bold uppercase">
                          Exp
                        </span>
                        <span
                          className={
                            item.expiryDate && new Date(item.expiryDate) < new Date()
                              ? 'font-bold text-red-600'
                              : ''
                          }
                        >
                          {item.expiryDate ? format(new Date(item.expiryDate), 'dd/MM/yyyy') : '-'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-lg font-bold">{item.quantity}</span>
                      <span className="text-muted-foreground text-xs">{item.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                      className="gap-2"
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
          data={{
            id: selectedItem.id,
            consumableId: selectedItem.consumableId,
            consumableName: selectedItem.consumableName,
            currentQty: selectedItem.quantity,
            unit: selectedItem.unit,
            batchNumber: selectedItem.batchNumber,
          }}
        />
      )}
    </>
  )
}

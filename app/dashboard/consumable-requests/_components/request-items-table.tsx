'use client'

import { useState } from 'react'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar, ChevronRight, Layers, Package, ScanBarcode } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

interface Allocation {
  batch: string | null
  expiry: Date | null
  qty: string
}

interface ItemData {
  id: string
  consumableName: string
  unit: string
  sku: string | null
  qtyRequested: string
  qtyApproved: string | null
}

interface RequestItemsTableProps {
  items: ItemData[]
  allocationsMap: Record<string, Allocation[]>
  isWarehouseStaff: boolean
  requestStatus: string
}

export function RequestItemsTable({
  items,
  allocationsMap,
  isWarehouseStaff,
  requestStatus,
}: RequestItemsTableProps) {
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null)

  const isApprovedOrLater = ['APPROVED', 'PROCESSING', 'READY_TO_PICKUP', 'COMPLETED'].includes(
    requestStatus,
  )

  const handleClose = () => setSelectedItem(null)

  const selectedAllocations = selectedItem ? allocationsMap[selectedItem.id] || [] : []
  const selectedTotalAllocated = selectedAllocations.reduce(
    (acc, curr) => acc + Number(curr.qty),
    0,
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-blue-600" />
            Daftar Barang ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead className="text-center">Jml Minta</TableHead>
                {isApprovedOrLater && <TableHead className="text-center">Disetujui</TableHead>}
                {/* Kolom kosong untuk panah indikator */}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const itemAllocations = allocationsMap[item.id] || []
                const hasAllocations = itemAllocations.length > 0

                const isClickable =
                  hasAllocations && (isWarehouseStaff || requestStatus === 'COMPLETED')

                return (
                  <TableRow
                    key={item.id}
                    onClick={() => isClickable && setSelectedItem(item)}
                    className={cn(
                      'transition-colors',
                      isClickable
                        ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                        : '',
                    )}
                  >
                    <TableCell className="text-muted-foreground text-center align-middle">
                      {index + 1}
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground font-medium">{item.consumableName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px]">
                            Unit: {item.unit}{' '}
                            {item.sku && <span className="opacity-50">| SKU: {item.sku}</span>}
                          </span>

                          {/* Badge kecil penanda ada info batch */}
                          {isClickable && (
                            <Badge
                              variant="outline"
                              className="h-4 gap-1 border-blue-200 bg-blue-50 px-1.5 py-0 text-[9px] text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                            >
                              <ScanBarcode className="h-2.5 w-2.5" />
                              {itemAllocations.length} Batch
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center align-middle font-mono font-medium">
                      {Number(item.qtyRequested)}
                    </TableCell>

                    {isApprovedOrLater && (
                      <TableCell className="text-center align-middle font-mono font-medium">
                        {item.qtyApproved !== null ? (
                          <Badge variant="secondary" className="font-mono font-semibold">
                            {Number(item.qtyApproved)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">-</span>
                        )}
                      </TableCell>
                    )}

                    {/* Panah Indikator di ujung kanan */}
                    <TableCell className="align-middle">
                      {isClickable && <ChevronRight className="text-muted-foreground/50 h-4 w-4" />}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- POPUP / DIALOG DETAIL BATCH --- */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Detail Pengambilan Stok
            </DialogTitle>
            <DialogDescription>
              Barang:{' '}
              <span className="text-foreground font-semibold">{selectedItem?.consumableName}</span>
              <br />
              Total diambil:{' '}
              <span className="text-foreground font-mono font-bold">
                {selectedTotalAllocated} {selectedItem?.unit}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="border-muted overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="h-9 text-xs">Nomor Batch</TableHead>
                  <TableHead className="h-9 text-xs">Kadaluarsa</TableHead>
                  <TableHead className="h-9 text-right text-xs">Ambil Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAllocations.map((alloc, index) => (
                  <TableRow key={index} className="text-xs">
                    <TableCell className="font-mono font-medium">
                      {alloc.batch || (
                        <span className="text-muted-foreground italic">No Batch</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="text-muted-foreground h-3 w-3" />
                        {alloc.expiry
                          ? format(new Date(alloc.expiry), 'dd MMM yyyy', { locale: idLocale })
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="bg-secondary rounded px-1.5 py-0.5 font-mono font-semibold">
                        {Number(alloc.qty)} {selectedItem?.unit}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

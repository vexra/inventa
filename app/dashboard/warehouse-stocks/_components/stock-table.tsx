'use client'

import Link from 'next/link'

import { AlertCircle, AlertTriangle, CheckCircle2, PackageX } from 'lucide-react'

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface StockItem {
  id: string
  consumableId: string
  name: string
  sku: string | null
  category: string | null
  quantity: number
  unit: string
  minimumStock: number | null
  updatedAt: string | null
}

interface StockTableProps {
  data: StockItem[]
}

export function StockTable({ data }: StockTableProps) {
  if (data.length === 0) {
    return (
      <div className="animate-in fade-in-50 flex min-h-75 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <PackageX className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Data stok kosong</h3>
        <p className="text-muted-foreground mb-4 text-sm">Tidak ada barang yang ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-75">Barang</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Sisa Stok</TableHead>
            <TableHead className="text-right">Min. Stok</TableHead>
            <TableHead className="text-right">Terakhir Update</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            // Logika Status
            const isOutOfStock = item.quantity <= 0
            const isLowStock = item.minimumStock !== null && item.quantity <= item.minimumStock

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs">SKU: {item.sku || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>{item.category || '-'}</TableCell>
                <TableCell className="text-center">
                  {isOutOfStock ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> Habis
                    </Badge>
                  ) : isLowStock ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300"
                    >
                      <AlertTriangle className="h-3 w-3" /> Menipis
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-green-500 bg-green-50 text-green-600 dark:bg-green-950/30"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Aman
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {item.quantity} <span className="text-muted-foreground text-xs">{item.unit}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-right">
                  {item.minimumStock ?? '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs">
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/adjustments?itemId=${item.consumableId}`}>
                            Opname
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Lakukan Penyesuaian Stok</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

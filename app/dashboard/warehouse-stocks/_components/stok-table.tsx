'use client'

import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  PackageX,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
    <div className="bg-card text-card-foreground rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-75">Barang</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-center">Status Stok</TableHead>
            <TableHead className="text-center">Kondisi</TableHead>
            <TableHead className="text-right">Total Stok</TableHead>
            <TableHead className="text-right">Min. Stok</TableHead>
            <TableHead className="w-12.5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            return (
              <TableRow key={item.id}>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex cursor-help items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>Expired</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ada batch yang sudah kadaluarsa!</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : item.hasNearExpiry ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex cursor-help items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Exp. Dekat</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ada batch yang akan segera kadaluarsa (&#60; 30 hari)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
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

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Aksi</DropdownMenuLabel>

                      <StockDetailDialog
                        itemName={item.name}
                        unit={item.unit}
                        batches={item.batches}
                      >
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat Detail
                        </DropdownMenuItem>
                      </StockDetailDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

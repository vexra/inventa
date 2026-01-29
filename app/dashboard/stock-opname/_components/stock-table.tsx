'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  ArrowUpDown,
  ClipboardEdit,
  Eye,
  Layers,
  MoreHorizontal,
  Package,
  Settings2,
} from 'lucide-react'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { cn } from '@/lib/utils'

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
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  currentSort: {
    column: string
    direction: 'asc' | 'desc'
  }
}

function SortableHeader({
  id: columnId,
  label,
  currentSort,
  onSort,
  className,
}: {
  id: string
  label: string
  currentSort: { column: string; direction: 'asc' | 'desc' }
  onSort: (id: string) => void
  className?: string
}) {
  return (
    <TableHead className={cn('h-10 px-0', className)}>
      <Button
        variant="ghost"
        onClick={() => onSort(columnId)}
        className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium tracking-wider uppercase"
      >
        {label}
        {currentSort.column === columnId && (
          <ArrowUpDown
            className={cn('ml-2 h-3 w-3', currentSort.direction === 'asc' && 'rotate-180')}
          />
        )}
      </Button>
    </TableHead>
  )
}

export function StockTable({ data, metadata, currentSort }: StockTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedItem, setSelectedItem] = useState<AggregatedStock | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    category: true,
    batch: true,
    total: true,
    action: true,
  })

  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) newParams.delete(key)
      else newParams.set(key, String(value))
    })
    return newParams.toString()
  }

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    router.push(
      `${pathname}?${createQueryString({
        sort: column,
        order: isAsc ? 'desc' : 'asc',
      })}`,
      { scroll: false },
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari barang / batch..." limit={metadata.itemsPerPage}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-9 px-3 text-xs sm:flex"
              >
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                Tampilan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-45">
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, name: c }))}
              >
                Nama Barang
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.category}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, category: c }))}
              >
                Kategori
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.batch}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, batch: c }))}
              >
                Batch
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.total}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, total: c }))}
              >
                Total Stok
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {visibleColumns.name && (
                  <SortableHeader
                    id="name"
                    label="Barang"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="min-w-60"
                  />
                )}
                {visibleColumns.category && (
                  <SortableHeader
                    id="category"
                    label="Kategori"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.batch && (
                  <SortableHeader
                    id="batchCount"
                    label="Jumlah Batch"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="text-center"
                  />
                )}
                {visibleColumns.total && (
                  <SortableHeader
                    id="total"
                    label="Total Stok"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
                <TableHead className="w-16 text-right text-xs uppercase">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-32 text-center text-sm">
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
                    className="group hover:bg-muted/50 border-b transition-colors last:border-0"
                  >
                    {visibleColumns.name && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {item.consumableName}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.category && (
                      <TableCell className="text-muted-foreground px-4 py-3">
                        {item.categoryName || '-'}
                      </TableCell>
                    )}

                    {visibleColumns.batch && (
                      <TableCell className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="gap-1 font-mono font-normal">
                          <Layers className="h-3 w-3" />
                          {item.batchCount}
                        </Badge>
                      </TableCell>
                    )}

                    {visibleColumns.total && (
                      <TableCell className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.totalQuantity}
                        </span>{' '}
                        <span className="text-muted-foreground text-xs">{item.unit}</span>
                      </TableCell>
                    )}

                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>

                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/stock-opname/${item.consumableId}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSelectedItem(item)}
                            className="text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:text-blue-400 dark:focus:bg-blue-900/20 dark:focus:text-blue-300"
                          >
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Opname Stok
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination metadata={metadata} />
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
    </div>
  )
}

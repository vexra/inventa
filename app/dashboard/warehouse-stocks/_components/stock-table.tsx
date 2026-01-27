'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AlertCircle, AlertTriangle, ArrowUpDown, CheckCircle2, Settings2 } from 'lucide-react'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
  // Optional children untuk slot filter tambahan (seperti Tabs Status & Warehouse Selector)
  children?: React.ReactNode
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

export function StockTable({ data, metadata, currentSort, children }: StockTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)

  // State column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    category: true,
    status: true,
    condition: true,
    totalQty: true,
    minStock: true,
  })

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', column)
    params.set('order', isAsc ? 'desc' : 'asc')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-md border shadow-sm">
        {/* Toolbar mencakup Search Input dan Children (Filter eksternal) */}
        <DataTableToolbar placeholder="Cari barang atau SKU..." limit={metadata.itemsPerPage}>
          {children}

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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                Atur Kolom
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, name: !!v }))}
              >
                Barang
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.category}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, category: !!v }))}
              >
                Kategori
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
              >
                Status Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.condition}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, condition: !!v }))}
              >
                Kondisi (QC)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.totalQty}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, totalQty: !!v }))}
              >
                Total Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.minStock}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, minStock: !!v }))}
              >
                Min. Stok
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
                    className="w-72"
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
                {visibleColumns.status && (
                  <TableHead className="px-4 text-center text-xs font-medium tracking-wider uppercase">
                    Status Stok
                  </TableHead>
                )}
                {visibleColumns.condition && (
                  <TableHead className="px-4 text-center text-xs font-medium tracking-wider uppercase">
                    Kondisi (QC)
                  </TableHead>
                )}
                {visibleColumns.totalQty && (
                  <SortableHeader
                    id="totalQuantity"
                    label="Total Stok"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="text-right" // Align header text logic needs override in SortableHeader usually, but keeping simple
                  />
                )}
                {visibleColumns.minStock && (
                  <SortableHeader
                    id="minimumStock"
                    label="Min. Stok"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="text-right"
                  />
                )}
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
                    className="group hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    onClick={() => setSelectedItem(item)}
                  >
                    {visibleColumns.name && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px] tracking-tight">
                            {item.sku || '-'}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.category && (
                      <TableCell className="text-muted-foreground px-4 py-3 text-sm">
                        {item.category || '-'}
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell className="px-4 py-3 text-center">
                        {item.status === 'OUT' ? (
                          <Badge variant="destructive" className="h-5 gap-1 px-2 text-[10px]">
                            <AlertCircle className="h-3 w-3" /> Habis
                          </Badge>
                        ) : item.status === 'LOW' ? (
                          <Badge
                            variant="secondary"
                            className="h-5 gap-1 bg-yellow-100 px-2 text-[10px] text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                          >
                            <AlertTriangle className="h-3 w-3" /> Menipis
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 border-green-200 bg-green-50 px-2 text-[10px] text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Aman
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.condition && (
                      <TableCell className="px-4 py-3 text-center">
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
                    )}

                    {visibleColumns.totalQty && (
                      <TableCell className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.totalQuantity}
                        </span>{' '}
                        <span className="text-muted-foreground text-xs">{item.unit}</span>
                      </TableCell>
                    )}

                    {visibleColumns.minStock && (
                      <TableCell className="text-muted-foreground px-4 py-3 text-right font-mono text-sm">
                        {item.minimumStock ?? '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination metadata={metadata} />
      </div>

      <div className="text-muted-foreground mt-2 text-right text-xs italic">
        * Klik pada baris barang untuk melihat detail batch.
      </div>

      <StockDetailDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        itemName={selectedItem?.name || ''}
        unit={selectedItem?.unit || ''}
        batches={selectedItem?.batches || []}
      />
    </div>
  )
}

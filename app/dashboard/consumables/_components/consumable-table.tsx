'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { deleteConsumable } from '../actions'
import { ConsumableDialog } from './consumable-dialog'

interface CategoryOption {
  id: string
  name: string
}

interface ConsumableData {
  id: string
  name: string
  sku: string
  categoryId: string
  categoryName: string
  baseUnit: string
  minimumStock: number
  hasExpiry: boolean
  description: string
}

interface ConsumableTableProps {
  data: ConsumableData[]
  categories: CategoryOption[]
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

/**
 * Komponen SortableHeader dipindahkan ke luar agar tidak dibuat ulang saat render.
 */
interface SortableHeaderProps {
  id: string
  label: string
  currentSort: { column: string; direction: 'asc' | 'desc' }
  onSort: (id: string) => void
  className?: string
}

function SortableHeader({ id, label, currentSort, onSort, className }: SortableHeaderProps) {
  return (
    <TableHead className={`h-10 px-0 ${className}`}>
      <Button
        variant="ghost"
        onClick={() => onSort(id)}
        className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
      >
        {label}
        {currentSort.column === id && (
          <ArrowUpDown
            className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
          />
        )}
      </Button>
    </TableHead>
  )
}

export function ConsumableTable({ data, categories, metadata, currentSort }: ConsumableTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    sku: true,
    category: true,
    minStock: true,
    feature: true,
  })

  const itemToEdit = data.find((u) => u.id === editingId)
  const itemToDelete = data.find((u) => u.id === deletingId)

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

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteConsumable(deletingId)
    if (res.error) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari nama atau SKU..." limit={metadata.itemsPerPage}>
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
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, name: v }))}
              >
                Nama Barang
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.sku}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, sku: v }))}
              >
                SKU
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.category}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, category: v }))}
              >
                Kategori
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.minStock}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, minStock: v }))}
              >
                Min. Stok
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.feature}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, feature: v }))}
              >
                Fitur
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visibleColumns.name && (
                  <SortableHeader
                    id="name"
                    label="Nama Barang"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.sku && (
                  <SortableHeader
                    id="sku"
                    label="SKU"
                    currentSort={currentSort}
                    onSort={handleSort}
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
                {visibleColumns.minStock && (
                  <SortableHeader
                    id="minStock"
                    label="Min. Stok"
                    className="text-center"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.feature && (
                  <SortableHeader
                    id="feature"
                    label="Fitur"
                    className="text-center"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                <TableHead className="h-10 w-20 px-4 text-right text-xs font-medium uppercase">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 border-b last:border-0">
                    {visibleColumns.name && (
                      <TableCell className="px-4 py-3 text-sm font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="text-muted-foreground h-4 w-4" />
                            {item.name}
                          </div>
                          {item.description && (
                            <span className="text-muted-foreground ml-6 line-clamp-1 text-xs font-normal italic">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.sku && (
                      <TableCell className="px-4 py-3 font-mono text-xs">{item.sku}</TableCell>
                    )}
                    {visibleColumns.category && (
                      <TableCell className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal">
                          {item.categoryName}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.minStock && (
                      <TableCell className="px-4 py-3 text-center text-sm">
                        {item.minimumStock}{' '}
                        <span className="text-muted-foreground text-xs">{item.baseUnit}</span>
                      </TableCell>
                    )}
                    {visibleColumns.feature && (
                      <TableCell className="px-4 py-3 text-center">
                        {item.hasExpiry && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <CalendarClock className="h-4 w-4 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>Butuh Expired Date</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingId(item.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
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

      {editingId && itemToEdit && (
        <ConsumableDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={itemToEdit}
          categories={categories}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Barang?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data barang{' '}
              <span className="text-foreground font-bold">{itemToDelete?.name}</span> secara
              permanen? Tindakan ini akan menghapus seluruh referensi data dari katalog dan tidak
              dapat dipulihkan kembali setelah proses selesai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

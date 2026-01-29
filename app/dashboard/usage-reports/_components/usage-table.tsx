'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  ArrowUpDown,
  Calendar,
  ClipboardList,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Settings2,
  Trash2,
  User,
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
import { cn } from '@/lib/utils'

import { deleteUsageReport } from '../actions'
import { UsageDialog } from './usage-dialog'

interface UsageReportItem {
  consumableId: string
  qtyUsed: string
  consumable: {
    name: string
    unit: string
  }
}

interface UsageReportData {
  id: string
  activityName: string
  createdAt: Date
  user: { name: string; image: string | null } | null
  room: { id: string; name: string } | null
  details: UsageReportItem[]
}

interface AvailableStockOption {
  id: string
  name: string
  unit: string
  currentQty: number
  roomId: string
}

interface RoomOption {
  id: string
  name: string
}

interface UsageTableProps {
  data: UsageReportData[]
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  availableStocks: AvailableStockOption[]
  rooms: RoomOption[]
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

export function UsageTable({
  data,
  metadata,
  availableStocks,
  rooms,
  currentSort,
}: UsageTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    activity: true,
    user: true,
    items: true,
    actions: true,
  })

  const itemToEdit = data.find((item) => item.id === editingId)

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
    const toastId = toast.loading('Menghapus laporan...')
    try {
      const result = await deleteUsageReport(deletingId)
      if (result.success) {
        toast.success(result.message, { id: toastId })
        router.refresh()
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch {
      toast.error('Gagal menghapus data', { id: toastId })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        {/* --- TOOLBAR --- */}
        <DataTableToolbar placeholder="Cari nama kegiatan..." limit={metadata.itemsPerPage}>
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
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.date}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, date: c }))}
              >
                Tanggal
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.activity}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, activity: c }))}
              >
                Nama Kegiatan
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.user}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, user: c }))}
              >
                Pelapor & Ruangan
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.items}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, items: c }))}
              >
                Total Item
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        {/* --- TABLE CONTENT --- */}
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10 text-center text-xs">#</TableHead>
                {visibleColumns.date && (
                  <SortableHeader
                    id="createdAt"
                    label="Tanggal"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="w-45"
                  />
                )}
                {visibleColumns.activity && (
                  <SortableHeader
                    id="activityName"
                    label="Kegiatan"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.user && (
                  <TableHead className="text-xs font-medium uppercase">Pelapor</TableHead>
                )}
                {visibleColumns.items && (
                  <TableHead className="text-center text-xs font-medium uppercase">Items</TableHead>
                )}
                <TableHead className="w-16 text-right text-xs uppercase">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    Tidak ada laporan pemakaian.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((report, index) => (
                  <TableRow
                    key={report.id}
                    className="hover:bg-muted/50 group border-b last:border-0"
                  >
                    <TableCell className="text-muted-foreground text-center text-xs">
                      {(metadata.currentPage - 1) * metadata.itemsPerPage + index + 1}
                    </TableCell>

                    {visibleColumns.date && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            {format(new Date(report.createdAt), 'dd MMM yyyy', {
                              locale: idLocale,
                            })}
                          </div>
                          <span className="text-muted-foreground pl-5.5 text-xs">
                            {format(new Date(report.createdAt), 'HH:mm')} WIB
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.activity && (
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{report.activityName}</span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.user && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="text-muted-foreground h-3.5 w-3.5" />
                            {report.user?.name || 'Unknown'}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <MapPin className="h-3.5 w-3.5" />
                            {report.room?.name || '-'}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.items && (
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          <Package className="mr-1.5 h-3 w-3 opacity-60" />
                          {report.details.length} Jenis
                        </Badge>
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
                          <DropdownMenuItem onClick={() => setEditingId(report.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingId(report.id)}
                            className="text-red-600 focus:text-red-700"
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

      {/* --- EDIT DIALOG --- */}
      {/* 1. rooms: Untuk list ruangan (meski disabled saat edit)
          2. availableStocks: Untuk dropdown barang
          3. initialData: Data yang akan diedit (termasuk roomId dari data tabel)
      */}
      {editingId && itemToEdit && (
        <UsageDialog
          rooms={rooms}
          availableStocks={availableStocks}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={{
            id: itemToEdit.id,
            roomId: itemToEdit.room?.id || '',
            activityName: itemToEdit.activityName,
            items: itemToEdit.details.map((d) => ({
              consumableId: d.consumableId,
              quantity: Number(d.qtyUsed),
            })),
          }}
          trigger={<span className="hidden" />}
        />
      )}

      {/* --- DELETE ALERT --- */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus laporan pemakaian dan <strong>mengembalikan stok</strong>{' '}
              barang ke ruangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Ya, Hapus & Rollback Stok
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

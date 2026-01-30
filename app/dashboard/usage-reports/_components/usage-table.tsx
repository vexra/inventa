'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  ArrowUpDown,
  Calendar,
  ClipboardList,
  Eye,
  MapPin,
  MoreHorizontal,
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
  batchNumber: string | null
  consumable: {
    name: string
    unit: string
  }
}

interface UsageReportData {
  id: string
  activityName: string
  activityDate: Date
  createdAt: Date
  user: { name: string; image: string | null } | null
  room: { id: string; name: string } | null
  details: UsageReportItem[]
}

interface AvailableStockOption {
  id: string
  consumableId: string
  name: string
  unit: string
  currentQty: number
  roomId: string
  batchNumber: string | null
  expiryDate: Date | null
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

  const findStockId = (roomId: string, consumableId: string, batchNumber: string | null) => {
    const match = availableStocks.find(
      (s) =>
        s.roomId === roomId &&
        s.consumableId === consumableId &&
        (batchNumber ? s.batchNumber === batchNumber : true),
    )
    return match ? match.id : ''
  }

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
                Pelapor
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.items}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, items: c }))}
              >
                Detail Barang
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {visibleColumns.date && (
                  <SortableHeader
                    id="activityDate"
                    label="Tanggal Kegiatan"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="w-45"
                  />
                )}
                {visibleColumns.activity && (
                  <SortableHeader
                    id="activityName"
                    label="Nama Kegiatan"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.user && (
                  <TableHead className="w-50 text-xs font-medium tracking-wider uppercase">
                    Pelapor
                  </TableHead>
                )}
                {visibleColumns.items && (
                  <TableHead className="min-w-37.5 text-xs font-medium tracking-wider uppercase">
                    Barang Digunakan
                  </TableHead>
                )}
                <TableHead className="w-12.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                    className="h-24 text-center text-sm"
                  >
                    Belum ada laporan pemakaian.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((report) => (
                  <TableRow key={report.id} className="hover:bg-muted/50 group">
                    {visibleColumns.date && (
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            {/* Menampilkan activityDate */}
                            {format(new Date(report.activityDate), 'dd MMM yyyy', {
                              locale: idLocale,
                            })}
                          </div>
                          {/* Opsional: Tampilkan jam input jika perlu, atau hapus */}
                          {/* <span className="text-muted-foreground pl-5.5 text-xs">
                             Input: {format(new Date(report.createdAt), 'HH:mm')}
                          </span> */}
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.activity && (
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{report.activityName}</span>
                        </div>
                        {report.room && (
                          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                            <MapPin className="h-3 w-3" />
                            {report.room.name}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.user && (
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="text-muted-foreground h-3.5 w-3.5" />
                            <span className="font-medium">{report.user?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.items && (
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background font-medium">
                            {new Set(report.details.map((d) => d.consumableId)).size} Jenis Barang
                          </Badge>
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="px-4 py-3 align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/usage-reports/${report.id}`}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => setEditingId(report.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20"
                            onClick={() => setDeletingId(report.id)}
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

      {!!editingId && itemToEdit && (
        <UsageDialog
          rooms={rooms}
          availableStocks={availableStocks}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={{
            id: itemToEdit.id,
            roomId: itemToEdit.room?.id || '',
            activityName: itemToEdit.activityName,
            activityDate: itemToEdit.activityDate,
            items: itemToEdit.details.map((d) => ({
              roomConsumableId: findStockId(
                itemToEdit.room?.id || '',
                d.consumableId,
                d.batchNumber,
              ),
              quantity: Number(d.qtyUsed),
            })),
          }}
          trigger={<span className="hidden" />}
        />
      )}

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

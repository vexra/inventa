'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AlertTriangle,
  Armchair,
  ArrowUpDown,
  Beaker,
  Building,
  Building2,
  MoreHorizontal,
  Package,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { roomTypeEnum } from '@/db/schema'

import { deleteRoom } from '../actions'
import { RoomDialog } from './room-dialog'

type RoomType = (typeof roomTypeEnum.enumValues)[number]

interface RoomData {
  id: string
  name: string
  unitId: string | null
  unitName: string | null
  buildingId: string
  buildingName: string | null
  type: RoomType
  qrToken: string | null
  description: string | null
}

interface Option {
  id: string
  name: string
  facultyId?: string | null
}

interface RoomTableProps {
  data: RoomData[]
  buildings: Option[]
  units: Option[]
  faculties?: Option[]
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
  currentBuildingFilter: string
  fixedUnitId?: string
}

const getTypeBadge = (type: RoomType) => {
  switch (type) {
    case 'LABORATORY':
      return (
        <Badge
          variant="outline"
          className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
        >
          <Beaker className="mr-1 h-3 w-3" /> Lab
        </Badge>
      )
    case 'ADMIN_OFFICE':
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
        >
          <Armchair className="mr-1 h-3 w-3" /> Kantor
        </Badge>
      )
    case 'WAREHOUSE_UNIT':
      return (
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
        >
          <Package className="mr-1 h-3 w-3" /> Gudang
        </Badge>
      )
    case 'LECTURE_HALL':
    default:
      return (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
        >
          <Building2 className="mr-1 h-3 w-3" /> Umum
        </Badge>
      )
  }
}

export function RoomTable({
  data,
  buildings,
  units,
  faculties,
  metadata,
  currentSort,
  currentBuildingFilter,
  fixedUnitId,
}: RoomTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    type: true,
    building: true,
    unit: true,
    qr: true,
  })

  const roomToEdit = data.find((r) => r.id === editingId)
  const roomToDelete = data.find((r) => r.id === deletingId)

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
      `${pathname}?${createQueryString({ sort: column, order: isAsc ? 'desc' : 'asc' })}`,
      { scroll: false },
    )
  }

  const handleBuildingFilterChange = (buildingId: string) => {
    router.push(
      `${pathname}?${createQueryString({
        buildingId: buildingId === 'all' ? null : buildingId,
        page: 1,
      })}`,
      { scroll: false },
    )
  }

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteRoom(deletingId)
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
        <DataTableToolbar placeholder="Cari ruangan..." limit={metadata.itemsPerPage}>
          <Select value={currentBuildingFilter} onValueChange={handleBuildingFilterChange}>
            <SelectTrigger className="h-9 w-48 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Building className="text-muted-foreground h-3.5 w-3.5" />
                <SelectValue placeholder="Semua Gedung" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Gedung</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-9 px-3 text-xs sm:flex"
              >
                <Settings2 className="mr-2 h-3.5 w-3.5" /> Tampilan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={(c) => setVisibleColumns((prev) => ({ ...prev, name: c }))}
              >
                Nama Ruangan
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(c) => setVisibleColumns((prev) => ({ ...prev, type: c }))}
              >
                Tipe
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.building}
                onCheckedChange={(c) => setVisibleColumns((prev) => ({ ...prev, building: c }))}
              >
                Lokasi
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.unit}
                onCheckedChange={(c) => setVisibleColumns((prev) => ({ ...prev, unit: c }))}
              >
                Unit Pemilik
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.qr}
                onCheckedChange={(c) => setVisibleColumns((prev) => ({ ...prev, qr: c }))}
              >
                QR Code
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visibleColumns.name && (
                  <TableHead className="h-10 w-[30%] px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Nama Ruangan{' '}
                      {currentSort.column === 'name' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${
                            currentSort.direction === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}

                {visibleColumns.building && (
                  <TableHead className="h-10 px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('building')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Lokasi{' '}
                      {currentSort.column === 'building' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${
                            currentSort.direction === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}

                {visibleColumns.type && (
                  <TableHead className="h-10 px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('type')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Tipe{' '}
                      {currentSort.column === 'type' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${
                            currentSort.direction === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}

                {visibleColumns.unit && (
                  <TableHead className="h-10 px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('unit')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Unit{' '}
                      {currentSort.column === 'unit' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${
                            currentSort.direction === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}

                {visibleColumns.qr && (
                  <TableHead className="h-10 px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('qr')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      QR{' '}
                      {currentSort.column === 'qr' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${
                            currentSort.direction === 'asc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Button>
                  </TableHead>
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
                          <span>{item.name}</span>
                          {item.description && (
                            <span className="text-muted-foreground text-[10px]">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.building && (
                      <TableCell className="text-muted-foreground px-4 py-3 text-sm">
                        {item.buildingName}
                      </TableCell>
                    )}

                    {visibleColumns.type && (
                      <TableCell className="px-4 py-3 text-sm">{getTypeBadge(item.type)}</TableCell>
                    )}

                    {visibleColumns.unit && (
                      <TableCell className="px-4 py-3 text-sm">
                        {item.unitName ? (
                          <span className="text-xs font-medium">{item.unitName}</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">
                            Fasilitas Umum
                          </span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.qr && (
                      <TableCell className="text-muted-foreground px-4 py-3 font-mono text-[10px]">
                        {item.qrToken || '-'}
                      </TableCell>
                    )}

                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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

      {editingId && roomToEdit && (
        <RoomDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={roomToEdit}
          buildings={buildings}
          units={units}
          faculties={faculties}
          fixedUnitId={fixedUnitId}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Ruangan?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus ruangan{' '}
              <span className="text-foreground font-bold">{roomToDelete?.name}</span>?
              <br />
              Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada aset inventaris yang masih
              tercatat di ruangan ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

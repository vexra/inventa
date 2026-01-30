'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  FileText,
  GraduationCap,
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

import { deleteUnit } from '../actions'
import { UnitDialog } from './unit-dialog'

interface UnitData {
  id: string
  name: string
  description: string | null
  facultyId: string | null
  facultyName: string | null
}

interface FacultyOption {
  id: string
  name: string
}

interface UnitTableProps {
  data: UnitData[]
  faculties: FacultyOption[]
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
  currentFacultyFilter: string
  fixedFacultyId?: string
}

export function UnitTable({
  data,
  faculties,
  metadata,
  currentSort,
  currentFacultyFilter,
  fixedFacultyId,
}: UnitTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    faculty: true,
    description: true,
    actions: true,
  })

  const unitToEdit = data.find((u) => u.id === editingId)
  const unitToDelete = data.find((u) => u.id === deletingId)

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

  const handleFacultyFilterChange = (facultyId: string) => {
    router.push(
      `${pathname}?${createQueryString({
        facultyId: facultyId === 'all' ? null : facultyId,
        page: 1,
      })}`,
      { scroll: false },
    )
  }

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteUnit(deletingId)
    if (res.error) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
    setDeletingId(null)
  }

  const showFacultyFilter = !fixedFacultyId

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari unit..." limit={metadata.itemsPerPage}>
          {showFacultyFilter && (
            <Select value={currentFacultyFilter} onValueChange={handleFacultyFilterChange}>
              <SelectTrigger className="h-9 w-45 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <GraduationCap className="text-muted-foreground h-3.5 w-3.5" />
                  <SelectValue placeholder="Semua Fakultas" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Fakultas</SelectItem>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, name: checked }))
                }
              >
                Nama Unit
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.faculty}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, faculty: checked }))
                }
              >
                Fakultas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.description}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, description: checked }))
                }
              >
                Deskripsi
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
                      Nama Unit
                      {currentSort.column === 'name' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.faculty && (
                  <TableHead className="h-10 w-[25%] px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('faculty')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Fakultas
                      {currentSort.column === 'faculty' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.description && (
                  <TableHead className="h-10 px-0">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('description')}
                      className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
                    >
                      Deskripsi
                      {currentSort.column === 'description' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
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
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 border-b last:border-0">
                    {visibleColumns.name && (
                      <TableCell className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="text-muted-foreground h-4 w-4" />
                          {item.name}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.faculty && (
                      <TableCell className="px-4 py-3 text-sm">
                        <Badge
                          variant="outline"
                          className="text-muted-foreground bg-muted/50 font-normal"
                        >
                          {item.facultyName || 'Tidak ada'}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.description && (
                      <TableCell className="px-4 py-3 text-sm">
                        {item.description ? (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-75 truncate">{item.description}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 italic">-</span>
                        )}
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

      {editingId && unitToEdit && (
        <UnitDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={unitToEdit}
          faculties={faculties}
          fixedFacultyId={fixedFacultyId}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Unit?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus unit{' '}
              <span className="text-foreground font-bold">{unitToDelete?.name}</span>?
              <br />
              Menghapus unit dapat mempengaruhi data pengguna dan ruangan yang terkait di dalamnya.
              Tindakan ini tidak dapat dibatalkan.
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

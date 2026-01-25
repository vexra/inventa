'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AlertTriangle,
  ArrowUpDown,
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

import { deleteFaculty } from '../actions'
import { FacultyDialog } from './faculty-dialog'

interface FacultyData {
  id: string
  name: string
  description: string | null
}

interface FacultyTableProps {
  data: FacultyData[]
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

export function FacultyTable({ data, metadata, currentSort }: FacultyTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    description: true,
    actions: true,
  })

  const facultyToEdit = data.find((u) => u.id === editingId)
  const facultyToDelete = data.find((u) => u.id === deletingId)

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
    const res = await deleteFaculty(deletingId)
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
        <DataTableToolbar placeholder="Cari nama fakultas..." limit={metadata.itemsPerPage}>
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
                Nama Fakultas
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
                      Nama Fakultas
                      {currentSort.column === 'name' && (
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
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 border-b last:border-0">
                    {visibleColumns.name && (
                      <TableCell className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="text-muted-foreground h-4 w-4" />
                          {item.name}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.description && (
                      <TableCell className="px-4 py-3 text-sm">
                        {item.description ? (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-100 truncate">{item.description}</span>
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

        {/* --- REUSABLE PAGINATION --- */}
        <DataTablePagination metadata={metadata} />
      </div>

      {/* --- DIALOGS (Tetap Sama) --- */}
      {editingId && facultyToEdit && (
        <FacultyDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={facultyToEdit}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Fakultas?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus fakultas{' '}
              <span className="text-foreground font-bold">{facultyToDelete?.name}</span>?
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

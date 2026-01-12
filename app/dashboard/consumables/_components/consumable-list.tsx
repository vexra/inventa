'use client'

import { useState } from 'react'

import { CalendarClock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

interface ConsumableListProps {
  data: ConsumableData[]
  categories: CategoryOption[]
}

export function ConsumableList({ data, categories }: ConsumableListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return

    const toastId = toast.loading('Menghapus data...')
    try {
      const result = await deleteConsumable(deletingId)
      if (result.success) {
        toast.success(result.message, { id: toastId })
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch {
      toast.error('Gagal menghapus', { id: toastId })
    } finally {
      setDeletingId(null)
    }
  }

  const itemToEdit = data.find((item) => item.id === editingId)

  return (
    <>
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12.5">#</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Min. Stok</TableHead>
              <TableHead className="text-center">Fitur</TableHead>
              <TableHead className="w-12.5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  Belum ada data barang.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      {item.description && (
                        <span className="text-muted-foreground truncate text-xs">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.categoryName}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.minimumStock} {item.baseUnit}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.hasExpiry && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <CalendarClock className="h-4 w-4 text-orange-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Butuh Expired Date</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingId(item.id)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingId(item.id)}
                          className="text-red-600 focus:bg-red-100 focus:text-red-600 dark:focus:bg-red-900/30"
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
            <AlertDialogTitle>Apakah anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan dan akan menghapus data barang ini secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-800"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

'use client'

import { useState } from 'react'

import { Box, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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

import { deleteItem } from '../actions'
import { ItemDialog } from './item-dialog'

interface ItemWithCategory {
  id: string
  name: string
  sku: string | null
  baseUnit: string
  minStockAlert: number | null
  description: string | null
  hasExpiry: boolean
  isActive: boolean
  categoryId: string
  categoryName: string
}

interface ItemListProps {
  data: ItemWithCategory[]
  categories: { id: string; name: string }[]
}

export function ItemList({ data, categories }: ItemListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteItem(deletingId)
    if (res.error) toast.error(res.error)
    else toast.success(res.message)
    setDeletingId(null)
  }

  const itemToEdit = data.find((item) => item.id === editingId)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Status & Info</TableHead>
              <TableHead className="w-16 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Tidak ada data barang.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className={!item.isActive ? 'bg-muted/50' : ''}>
                  <TableCell className="py-4 align-top font-medium">
                    <span className="flex items-center gap-2 text-base">
                      <Box className="h-4 w-4 text-blue-600" />
                      {item.name}
                    </span>
                  </TableCell>

                  <TableCell className="py-4 align-top">
                    <Badge variant="secondary" className="font-normal text-slate-600">
                      {item.categoryName}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground py-4 align-top font-mono text-sm">
                    {item.sku || '-'}
                  </TableCell>

                  <TableCell className="py-4 align-top">{item.baseUnit}</TableCell>

                  <TableCell className="py-4 align-top">
                    <Badge
                      className={`w-fit ${
                        item.isActive
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {item.isActive ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-4 text-right align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
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
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600 focus:text-red-600" /> Hapus
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
        <ItemDialog
          mode="edit"
          categories={categories}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={{
            ...itemToEdit,
            sku: itemToEdit.sku ?? undefined,
            description: itemToEdit.description ?? undefined,
            minStockAlert: itemToEdit.minStockAlert ?? undefined,
          }}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Barang?</AlertDialogTitle>
            <AlertDialogDescription>
              Sistem akan melakukan <strong>Smart Delete</strong>:
              <ul className="mt-2 ml-5 list-disc text-slate-600">
                <li>
                  Jika barang <strong>pernah dipakai</strong>, data hanya akan diarsipkan (Soft
                  Delete).
                </li>
                <li>
                  Jika barang <strong>belum pernah dipakai</strong>, data akan dihapus permanen
                  (Hard Delete).
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Konfirmasi Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

'use client'

import { useState } from 'react'

import { FlaskConical, MoreHorizontal, Package, Pencil, Trash2 } from 'lucide-react'
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

import { deleteWarehouse } from '../actions'
import { WarehouseDialog } from './warehouse-dialog'

type WarehouseWithFaculty = {
  id: string
  name: string
  type: 'CHEMICAL' | 'GENERAL_ATK'
  description: string | null
  facultyId: string | null
  facultyName: string | null
}

interface FacultyOption {
  id: string
  name: string
}

interface WarehouseListProps {
  data: WarehouseWithFaculty[]
  faculties: FacultyOption[]
}

export function WarehouseList({ data, faculties }: WarehouseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteWarehouse(deletingId)
    if (res.error) toast.error(res.error)
    else toast.success(res.message)
    setDeletingId(null)
  }

  const warehouseToEdit = data.find((w) => w.id === editingId)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Gudang</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Fakultas</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Tidak ada data gudang.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`gap-1 ${
                        item.type === 'CHEMICAL'
                          ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100' // Warna Kimia (Soft Orange)
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100' // Warna Umum (Soft Blue)
                      }`}
                    >
                      {item.type === 'CHEMICAL' ? (
                        <>
                          <FlaskConical className="h-3 w-3" /> Kimia
                        </>
                      ) : (
                        <>
                          <Package className="h-3 w-3" /> Umum
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">{item.facultyName || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground block max-w-50 truncate text-sm">
                      {item.description || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
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

      {editingId && warehouseToEdit && (
        <WarehouseDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={warehouseToEdit}
          faculties={faculties}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Gudang?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Pastikan gudang ini sudah <strong>kosong</strong>{' '}
              sebelum dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

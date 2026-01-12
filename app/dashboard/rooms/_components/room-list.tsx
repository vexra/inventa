'use client'

import { useState } from 'react'

import {
  Armchair,
  Beaker,
  Building2,
  MoreHorizontal,
  Package,
  Pencil,
  QrCode,
  Trash2,
} from 'lucide-react'
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

import { deleteRoom } from '../actions'
import { RoomDialog } from './room-dialog'

type RoomType = 'LABORATORY' | 'ADMIN_OFFICE' | 'LECTURE_HALL' | 'WAREHOUSE_UNIT'

interface RoomData {
  id: string
  name: string
  unitId: string
  unitName: string | null
  type: RoomType
  qrToken: string | null
  description: string | null
}

interface UnitOption {
  id: string
  name: string
}

interface RoomListProps {
  data: RoomData[]
  units: UnitOption[]
  isSuperAdmin: boolean // Tambahkan prop ini
}

const getTypeBadge = (type: RoomType) => {
  // ... (kode badge tetap sama seperti sebelumnya)
  switch (type) {
    case 'LABORATORY':
      return (
        <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
          <Beaker className="mr-1 h-3 w-3" /> Lab
        </Badge>
      )
    case 'ADMIN_OFFICE':
      return (
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
          <Armchair className="mr-1 h-3 w-3" /> Kantor
        </Badge>
      )
    case 'WAREHOUSE_UNIT':
      return (
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
          <Package className="mr-1 h-3 w-3" /> Gudang Unit
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          <Building2 className="mr-1 h-3 w-3" /> Kelas/Umum
        </Badge>
      )
  }
}

export function RoomList({ data, units, isSuperAdmin }: RoomListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteRoom(deletingId)
    if (res.error) toast.error(res.error)
    else toast.success(res.message)
    setDeletingId(null)
  }

  const roomToEdit = data.find((r) => r.id === editingId)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Ruangan</TableHead>
              <TableHead>Tipe</TableHead>

              {isSuperAdmin && <TableHead>Unit / Jurusan</TableHead>}

              <TableHead>QR Token</TableHead>
              <TableHead className="w-20 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 5 : 4} className="h-24 text-center">
                  Tidak ada data ruangan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      {item.description && (
                        <span className="text-muted-foreground text-xs">{item.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(item.type)}</TableCell>

                  {/* KONDISIONAL CELL */}
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="text-sm">{item.unitName || '-'}</div>
                    </TableCell>
                  )}

                  <TableCell>
                    {item.qrToken && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <QrCode className="h-3 w-3" />
                              <span className="max-w-25 truncate">{item.qrToken}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Token: {item.qrToken}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
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

      {editingId && roomToEdit && (
        <RoomDialog
          mode="edit"
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          initialData={roomToEdit}
          units={units}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ruangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada aset yang tercatat di ruangan
              ini sebelum menghapus.
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

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WarehouseFormValues, warehouseSchema } from '@/lib/validations/warehouse'

import { createWarehouse, updateWarehouse } from '../actions'

interface FacultyOption {
  id: string
  name: string
}

interface WarehouseDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    type: 'CHEMICAL' | 'GENERAL_ATK'
    facultyId: string | null
    description: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  faculties: FacultyOption[]
  fixedFacultyId?: string | null
}

export function WarehouseDialog({
  mode = 'create',
  initialData,
  open,
  onOpenChange,
  faculties = [],
  fixedFacultyId,
}: WarehouseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'GENERAL_ATK',
      facultyId: fixedFacultyId || initialData?.facultyId || undefined,
      description: initialData?.description || '',
    },
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: WarehouseFormValues) {
    try {
      let result
      if (mode === 'create') {
        result = await createWarehouse(data)
      } else if (initialData?.id) {
        result = await updateWarehouse(initialData.id, data)
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message)
        setIsOpen?.(false)
        if (mode === 'create') form.reset()
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah Gudang
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Gudang' : 'Edit Gudang'}</DialogTitle>
          <DialogDescription>Kelola lokasi penyimpanan aset dan bahan.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Gudang</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Gudang Kimia A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Gudang</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Jenis" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GENERAL_ATK">Umum / ATK</SelectItem>
                      <SelectItem value="CHEMICAL">Bahan Kimia (B3)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milik Fakultas</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                    disabled={!!fixedFacultyId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Fakultas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {faculties.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fixedFacultyId && (
                    <p className="text-muted-foreground text-[0.8rem]">
                      *Terkunci otomatis ke fakultas Anda.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi / Lokasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Detail lokasi atau keterangan..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Simpan' : 'Perbarui'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

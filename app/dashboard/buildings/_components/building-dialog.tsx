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
  FormDescription,
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
import { BuildingFormValues, buildingSchema } from '@/lib/validations/building'

import { createBuilding, updateBuilding } from '../actions'

interface BuildingDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    code: string | null
    description: string | null
    facultyId: string
  }
  facultyOptions: { id: string; name: string }[]
  currentUserFacultyId?: string | null // Jika user adalah faculty_admin
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BuildingDialog({
  mode = 'create',
  initialData,
  facultyOptions,
  currentUserFacultyId,
  open,
  onOpenChange,
}: BuildingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  // Default Value Logic
  const defaultFacultyId =
    initialData?.facultyId ||
    currentUserFacultyId ||
    (facultyOptions.length > 0 ? facultyOptions[0].id : '')

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      facultyId: defaultFacultyId,
    },
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: BuildingFormValues) {
    try {
      let result
      if (mode === 'create') {
        result = await createBuilding(data)
      } else if (initialData?.id) {
        result = await updateBuilding(initialData.id, data)
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
            <Plus className="mr-2 h-4 w-4" /> Tambah Gedung
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Gedung Baru' : 'Edit Gedung'}</DialogTitle>
          <DialogDescription>Kelola data gedung fisik universitas.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Field Fakultas (Dropdown) */}
            <FormField
              control={form.control}
              name="facultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fakultas Pemilik</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!currentUserFacultyId} // Disable jika dia Faculty Admin (Otomatis terkunci)
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Fakultas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facultyOptions.map((fac) => (
                        <SelectItem key={fac.id} value={fac.id}>
                          {fac.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentUserFacultyId && (
                    <FormDescription>
                      Anda hanya dapat menambahkan gedung di fakultas Anda.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Gedung</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Gedung MIPA Terpadu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Gedung (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: GMT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Keterangan lokasi..." {...field} />
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

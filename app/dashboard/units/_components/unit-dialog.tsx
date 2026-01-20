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
import { UnitFormValues, unitSchema } from '@/lib/validations/unit'

import { createUnit, updateUnit } from '../actions'

interface FacultyOption {
  id: string
  name: string
}

interface UnitDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    description: string | null
    facultyId: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  faculties: FacultyOption[]
  fixedFacultyId?: string
}

export function UnitDialog({
  mode = 'create',
  initialData,
  open,
  onOpenChange,
  faculties = [],
  fixedFacultyId,
}: UnitDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      facultyId: initialData?.facultyId || fixedFacultyId || '',
    },
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: UnitFormValues) {
    try {
      const payload = {
        ...data,
        facultyId: fixedFacultyId || data.facultyId,
      }

      let result
      if (mode === 'create') {
        result = await createUnit(payload)
      } else if (initialData?.id) {
        result = await updateUnit(initialData.id, payload)
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
            <Plus className="mr-2 h-4 w-4" /> Tambah Unit
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Unit Baru' : 'Edit Unit'}</DialogTitle>
          <DialogDescription>Hubungkan unit kerja dengan fakultas terkait.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fixedFacultyId ? (
              <input type="hidden" {...form.register('facultyId')} value={fixedFacultyId} />
            ) : (
              <FormField
                control={form.control}
                name="facultyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fakultas Induk</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={mode === 'edit'}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Fakultas..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {faculties.map((faculty) => (
                          <SelectItem key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Unit / Jurusan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Jurusan Biologi" {...field} />
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
                    <Input placeholder="Keterangan singkat..." {...field} />
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

'use client'

import { useMemo, useState } from 'react'
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
import { RoomFormValues, roomSchema } from '@/lib/validations/room'

import { createRoom, updateRoom } from '../actions'

interface UnitOption {
  id: string
  name: string
  facultyId?: string | null
}

interface FacultyOption {
  id: string
  name: string
}

interface RoomDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    unitId: string
    type: 'LABORATORY' | 'ADMIN_OFFICE' | 'LECTURE_HALL' | 'WAREHOUSE_UNIT'
    description: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  units: UnitOption[]
  faculties?: FacultyOption[]
  fixedUnitId?: string
}

export function RoomDialog({
  mode = 'create',
  initialData,
  open,
  onOpenChange,
  units = [],
  faculties = [],
  fixedUnitId,
}: RoomDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const isSuperAdmin = faculties.length > 0 && !fixedUnitId

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(() => {
    if (mode === 'edit' && initialData?.unitId && isSuperAdmin) {
      const currentUnit = units.find((u) => u.id === initialData.unitId)
      return currentUnit?.facultyId || ''
    }
    return ''
  })

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: initialData?.name || '',
      unitId: initialData?.unitId || fixedUnitId || '',
      type: initialData?.type || 'LECTURE_HALL',
      description: initialData?.description || '',
    },
  })

  const filteredUnits = useMemo(() => {
    if (isSuperAdmin && selectedFacultyId) {
      return units.filter((u) => u.facultyId === selectedFacultyId)
    }
    if (isSuperAdmin && !selectedFacultyId) {
      return []
    }
    return units
  }, [units, isSuperAdmin, selectedFacultyId])

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: RoomFormValues) {
    try {
      const payload = {
        ...data,
        unitId: fixedUnitId || data.unitId,
      }

      let result
      if (mode === 'create') {
        result = await createRoom(payload)
      } else if (initialData?.id) {
        result = await updateRoom(initialData.id, payload)
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message)
        setIsOpen?.(false)
        if (mode === 'create') {
          form.reset()
          setSelectedFacultyId('')
        }
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
            <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Ruangan Baru' : 'Edit Ruangan'}</DialogTitle>
          <DialogDescription>Kelola data ruangan untuk lokasi aset dan kegiatan.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Ruangan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Lab Komputer 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fixedUnitId ? (
              <input type="hidden" {...form.register('unitId')} value={fixedUnitId} />
            ) : (
              <>
                {isSuperAdmin && (
                  <FormItem>
                    <FormLabel>Pilih Fakultas</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        setSelectedFacultyId(val)
                        form.setValue('unitId', '')
                      }}
                      value={selectedFacultyId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Fakultas..." />
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
                  </FormItem>
                )}

                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milik Unit/Jurusan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSuperAdmin && !selectedFacultyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isSuperAdmin && !selectedFacultyId
                                  ? 'Pilih Fakultas Dulu'
                                  : 'Pilih Unit...'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredUnits.length === 0 ? (
                            <div className="text-muted-foreground p-2 text-center text-xs">
                              Tidak ada unit tersedia
                            </div>
                          ) : (
                            filteredUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Ruangan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Jenis" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LECTURE_HALL">Kelas / Umum</SelectItem>
                      <SelectItem value="LABORATORY">Laboratorium</SelectItem>
                      <SelectItem value="ADMIN_OFFICE">Kantor / Admin</SelectItem>
                      <SelectItem value="WAREHOUSE_UNIT">Gudang Unit</SelectItem>
                    </SelectContent>
                  </Select>
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

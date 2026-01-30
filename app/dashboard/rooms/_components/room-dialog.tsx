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
import { roomTypeEnum } from '@/db/schema'
import { cn } from '@/lib/utils'
import { RoomFormValues, roomSchema } from '@/lib/validations/room'

import { createRoom, updateRoom } from '../actions'

type RoomType = (typeof roomTypeEnum.enumValues)[number]

const roomTypeLabels: Record<string, string> = {
  LABORATORY: 'Laboratorium',
  ADMIN_OFFICE: 'Kantor / Admin',
  LECTURE_HALL: 'Kelas / Umum',
  WAREHOUSE_UNIT: 'Gudang Unit',
}

interface Option {
  id: string
  name: string
  facultyId?: string | null
}

interface RoomDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    unitId: string | null
    buildingId: string
    type: RoomType
    description: string | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  units: Option[]
  buildings: Option[]
  faculties?: Option[]
  fixedUnitId?: string
}

export function RoomDialog({
  mode = 'create',
  initialData,
  open,
  onOpenChange,
  units = [],
  buildings = [],
  faculties = [],
  fixedUnitId,
}: RoomDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const isSuperAdmin = faculties.length > 0 && !fixedUnitId

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(() => {
    if (mode === 'edit' && initialData?.buildingId && isSuperAdmin) {
      const bld = buildings.find((b) => b.id === initialData.buildingId)
      return bld?.facultyId || ''
    }
    return ''
  })

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: initialData?.name || '',
      buildingId: initialData?.buildingId || '',
      unitId: initialData?.unitId || fixedUnitId || 'null_value',
      type: initialData?.type || 'LECTURE_HALL',
      description: initialData?.description || '',
    },
  })

  const filteredBuildings = useMemo(() => {
    if (isSuperAdmin && selectedFacultyId) {
      return buildings.filter((b) => b.facultyId === selectedFacultyId)
    }
    if (isSuperAdmin && !selectedFacultyId) return []
    return buildings
  }, [buildings, isSuperAdmin, selectedFacultyId])

  const filteredUnits = useMemo(() => {
    if (isSuperAdmin && selectedFacultyId) {
      return units.filter((u) => u.facultyId === selectedFacultyId)
    }
    if (isSuperAdmin && !selectedFacultyId) return []
    return units
  }, [units, isSuperAdmin, selectedFacultyId])

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: RoomFormValues) {
    try {
      let finalUnitId: string | null = data.unitId ?? null
      if (data.unitId === 'null_value') finalUnitId = null
      if (fixedUnitId) finalUnitId = fixedUnitId

      const payload = { ...data, unitId: finalUnitId }

      let result
      if (mode === 'create') result = await createRoom(payload)
      else if (initialData?.id) result = await updateRoom(initialData.id, payload)

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

  const handleOpenChange = (open: boolean) => {
    if (!open && mode === 'create') {
      form.reset()
      setSelectedFacultyId('')
    }
    setIsOpen?.(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah Ruangan
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Ruangan' : 'Edit Ruangan'}</DialogTitle>
          <DialogDescription>Pastikan lokasi gedung dan unit kepemilikan sesuai.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSuperAdmin && (
              <FormItem>
                <FormLabel>Pilih Fakultas</FormLabel>
                <Select
                  disabled={mode === 'edit'}
                  onValueChange={(val) => {
                    setSelectedFacultyId(val)
                    form.setValue('buildingId', '')
                    form.setValue('unitId', 'null_value')
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
              name="buildingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi Gedung</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSuperAdmin && !selectedFacultyId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Gedung..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBuildings.length === 0 ? (
                        <div className="text-muted-foreground p-2 text-center text-xs">
                          {isSuperAdmin && !selectedFacultyId
                            ? 'Pilih Fakultas dulu'
                            : 'Tidak ada data gedung'}
                        </div>
                      ) : (
                        filteredBuildings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {!fixedUnitId && (
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kepemilikan Unit (Opsional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || 'null_value'}
                      disabled={isSuperAdmin && !selectedFacultyId}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            'w-full',
                            (!field.value || field.value === 'null_value') &&
                              'text-muted-foreground',
                          )}
                        >
                          <SelectValue placeholder="Pilih Unit..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null_value" className="text-muted-foreground italic">
                          -- Milik Bersama (Fasilitas Umum) --
                        </SelectItem>
                        {filteredUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Kosongkan jika fasilitas umum.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roomTypeEnum.enumValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {roomTypeLabels[type] || type}
                          </SelectItem>
                        ))}
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
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-4 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
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

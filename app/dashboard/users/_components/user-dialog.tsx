'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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

import { createUserAction, updateUserAction } from '../actions'

const formSchema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.email('Email tidak valid'),
    password: z.string().optional(),
    role: z.enum(['super_admin', 'faculty_admin', 'unit_admin', 'warehouse_staff', 'unit_staff']),
    unitId: z.string().optional(),
    warehouseId: z.string().optional(),
    facultyId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'faculty_admin' && !data.facultyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wajib memilih Fakultas untuk role Admin Fakultas.',
        path: ['facultyId'],
      })
    }

    if (['unit_admin', 'unit_staff'].includes(data.role)) {
      if (!data.facultyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pilih Fakultas dahulu untuk memuat daftar Unit.',
          path: ['facultyId'],
        })
      }
      if (!data.unitId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unit/Jurusan wajib dipilih.',
          path: ['unitId'],
        })
      }
    }

    if (data.role === 'warehouse_staff' && !data.warehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Wajib memilih Gudang tempat bertugas.',
        path: ['warehouseId'],
      })
    }
  })

type UserRole = z.infer<typeof formSchema>['role']

interface UnitData {
  id: string
  name: string
  facultyId: string | null
}

interface WarehouseData {
  id: string
  name: string
}

interface FacultyData {
  id: string
  name: string
}

interface UserDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    email: string
    role: UserRole
    unitId?: string
    warehouseId?: string
    facultyId?: string
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  units: UnitData[]
  warehouses: WarehouseData[]
  faculties: FacultyData[]
}

export function UserDialog({
  mode = 'create',
  initialData,
  open,
  onOpenChange,
  units,
  warehouses,
  faculties,
}: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'unit_staff',
      unitId: initialData?.unitId || '',
      warehouseId: initialData?.warehouseId || '',
      facultyId: initialData?.facultyId || '',
    },
  })

  const role = useWatch({ control: form.control, name: 'role' })
  const selectedFacultyId = useWatch({ control: form.control, name: 'facultyId' })

  const filteredUnits = selectedFacultyId
    ? units.filter((u) => u.facultyId === selectedFacultyId)
    : []

  useEffect(() => {
    const currentUnit = units.find((u) => u.id === form.getValues('unitId'))
    if (currentUnit && currentUnit.facultyId !== selectedFacultyId && selectedFacultyId) {
      form.setValue('unitId', '')
    }
  }, [selectedFacultyId, units, form])

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (mode === 'create' && (!data.password || data.password.length < 8)) {
      form.setError('password', { message: 'Password wajib diisi minimal 8 karakter' })
      return
    }

    try {
      let result
      if (mode === 'create') {
        result = await createUserAction(data as any)
      } else if (initialData?.id) {
        result = await updateUserAction(initialData.id, data as any)
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message)
        setIsOpen?.(false)
        if (mode === 'create') {
          form.reset()
          setShowPassword(false)
        }
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  const needsFaculty = ['faculty_admin', 'unit_admin', 'unit_staff'].includes(role)
  const needsUnit = ['unit_admin', 'unit_staff'].includes(role)
  const needsWarehouse = role === 'warehouse_staff'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah User
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah User Baru' : 'Edit User'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="text-right">Nama Lengkap</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input placeholder="Nama user" {...field} />
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="text-right">Email</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input placeholder="email@universitas.ac.id" {...field} />
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="text-right">Password</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={
                            mode === 'create' ? 'Min. 8 karakter' : 'Isi jika ingin ubah'
                          }
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <Eye className="text-muted-foreground h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-xs" />
                  </div>
                </FormItem>
              )}
            />

            <div className="my-2 border-t" />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="text-right">Role Access</FormLabel>
                  <div className="col-span-3">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="faculty_admin">Admin Fakultas</SelectItem>
                        <SelectItem value="unit_admin">Admin Unit/Jurusan</SelectItem>
                        <SelectItem value="unit_staff">Staff Unit/Dosen</SelectItem>
                        <SelectItem value="warehouse_staff">Petugas Gudang</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="mt-1 text-xs" />
                  </div>
                </FormItem>
              )}
            />

            {needsFaculty && (
              <FormField
                control={form.control}
                name="facultyId"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                    <FormLabel className="text-right">
                      Fakultas{' '}
                      {role !== 'faculty_admin' && (
                        <span className="text-muted-foreground block text-[10px] font-normal">
                          (Filter Unit)
                        </span>
                      )}
                    </FormLabel>
                    <div className="col-span-3">
                      <Select onValueChange={field.onChange} value={field.value || ''}>
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
                      <FormMessage className="mt-1 text-xs" />
                    </div>
                  </FormItem>
                )}
              />
            )}

            {needsUnit && (
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                    <FormLabel className="text-right">Unit / Jurusan</FormLabel>
                    <div className="col-span-3">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={!selectedFacultyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={selectedFacultyId ? 'Pilih Unit' : 'Pilih Fakultas dulu'}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredUnits.length > 0 ? (
                            filteredUnits.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="text-muted-foreground p-2 text-center text-sm">
                              Tidak ada unit di fakultas ini
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs" />
                    </div>
                  </FormItem>
                )}
              />
            )}

            {needsWarehouse && (
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                    <FormLabel className="text-right">Gudang</FormLabel>
                    <div className="col-span-3">
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Gudang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs" />
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
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

const formSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').or(z.literal('')).optional(),
  role: z.enum(['super_admin', 'faculty_admin', 'unit_admin', 'warehouse_staff', 'unit_staff']),
  unitId: z.string().optional(),
  warehouseId: z.string().optional(),
})

type UserRole = z.infer<typeof formSchema>['role']

interface UserInitialData {
  id: string
  name: string
  email: string
  role: string
  unitId?: string | null
  warehouseId?: string | null
}

interface UserDialogProps {
  mode: 'create' | 'edit'
  initialData?: UserInitialData
  units?: { id: string; name: string }[]
  warehouses?: { id: string; name: string }[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UserDialog({
  mode,
  initialData,
  units = [],
  warehouses = [],
  open,
  onOpenChange,
}: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const defaultRole = (
    ['super_admin', 'faculty_admin', 'unit_admin', 'warehouse_staff', 'unit_staff'].includes(
      initialData?.role || '',
    )
      ? initialData?.role
      : 'unit_staff'
  ) as UserRole

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: defaultRole,
      unitId: initialData?.unitId || undefined,
      warehouseId: initialData?.warehouseId || undefined,
    },
  })

  const isLoading = form.formState.isSubmitting
  const role = useWatch({ control: form.control, name: 'role' })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (mode === 'create') {
        const res = await createUserAction(values)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('User berhasil dibuat')
          setIsOpen?.(false)
          form.reset()
          setShowPassword(false)
        }
      } else {
        if (!initialData?.id) return
        const res = await updateUserAction(initialData.id, values)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success('User berhasil diperbarui')
          setIsOpen?.(false)
          setShowPassword(false)
        }
      }
    } catch {
      toast.error('Terjadi kesalahan')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah User
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama user" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@contoh.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password{' '}
                    {mode === 'edit' && (
                      <span className="text-muted-foreground text-xs">
                        (Isi jika ingin mengganti)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        {...field}
                        className="pr-10"
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
                        <span className="sr-only">
                          {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peran (Role)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Peran" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="faculty_admin">Admin Fakultas</SelectItem>
                      <SelectItem value="unit_admin">Admin Unit/Prodi</SelectItem>
                      <SelectItem value="warehouse_staff">Staf Gudang</SelectItem>
                      <SelectItem value="unit_staff">Staf Unit/User Biasa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(role === 'unit_staff' || role === 'unit_admin') && (
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit / Prodi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {role === 'warehouse_staff' && (
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gudang</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
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

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ConsumableFormValues, consumableSchema } from '@/lib/validations/consumable'

import { createConsumable, updateConsumable } from '../actions'

interface CategoryOption {
  id: string
  name: string
}

interface ConsumableDialogProps {
  mode?: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    sku: string | null
    categoryId: string | null
    baseUnit: string
    minimumStock: number | null
    hasExpiry: boolean
    description: string | null
  }
  categories: CategoryOption[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConsumableDialog({
  mode = 'create',
  initialData,
  categories,
  open,
  onOpenChange,
}: ConsumableDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const defaultValues = {
    name: initialData?.name ?? '',
    sku: initialData?.sku ?? '',
    categoryId: initialData?.categoryId ?? '',
    baseUnit: initialData?.baseUnit ?? '',
    minimumStock: initialData?.minimumStock ?? 10,
    hasExpiry: initialData?.hasExpiry ?? false,
    description: initialData?.description ?? '',
  }

  const form = useForm<ConsumableFormValues>({
    resolver: zodResolver(consumableSchema) as any,
    defaultValues,
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: ConsumableFormValues) {
    try {
      let result
      if (mode === 'create') {
        result = await createConsumable(data)
      } else if (initialData?.id) {
        result = await updateConsumable(initialData.id, data)
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
          <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800">
            <Plus className="mr-2 h-4 w-4" /> Tambah Barang
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Master Barang' : 'Edit Barang'}</DialogTitle>
          <DialogDescription>Input data master barang (ATK, Bahan Kimia, dll).</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Barang</FormLabel>
                    <FormControl>
                      <Input placeholder="Kertas A4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Kode</FormLabel>
                    <FormControl>
                      <Input placeholder="ATK-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="baseUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <FormControl>
                      <Input placeholder="Pcs / Box / Liter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Stok Minimum</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hasExpiry"
              render={({ field }) => (
                <FormItem className="border-input flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-slate-400 text-white data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 dark:border-slate-500 dark:data-[state=checked]:border-green-600 dark:data-[state=checked]:bg-green-600"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Butuh Expired Date?</FormLabel>
                    <FormDescription>
                      Centang jika barang ini memiliki masa kadaluarsa.
                    </FormDescription>
                  </div>
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
                    <Input placeholder="Spesifikasi..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-800"
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

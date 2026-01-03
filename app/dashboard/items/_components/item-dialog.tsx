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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ItemFormValues, itemSchema } from '@/lib/validations/item'

import { createItem, updateItem } from '../actions'

interface CategoryOption {
  id: string
  name: string
}

interface ItemDialogProps {
  mode?: 'create' | 'edit'
  categories: CategoryOption[]
  initialData?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ItemDialog({
  mode = 'create',
  categories,
  initialData,
  open,
  onOpenChange,
}: ItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  // FIX: Menghapus generic <ItemFormValues> agar TypeScript meng-infer dari resolver
  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: initialData?.name || '',
      categoryId: initialData?.categoryId || '',
      sku: initialData?.sku || '',
      baseUnit: initialData?.baseUnit || '',
      minStockAlert: initialData?.minStockAlert || 0,
      description: initialData?.description || '',
      hasExpiry: initialData?.hasExpiry ?? false,
      isActive: initialData?.isActive ?? true,
    },
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: ItemFormValues) {
    try {
      let result
      if (mode === 'create') {
        result = await createItem(data)
      } else if (initialData?.id) {
        result = await updateItem(initialData.id, data)
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message)
        setIsOpen?.(false)
        if (mode === 'create') form.reset()
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah Barang
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Barang Baru' : 'Edit Barang'}</DialogTitle>
          <DialogDescription>Isi detail informasi barang inventaris.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Barang</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Laptop Acer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        {/* UPDATE: Menambahkan w-full agar select memanjang penuh */}
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
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU / Kode</FormLabel>
                    <FormControl>
                      <Input placeholder="KODE-123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan (Unit)</FormLabel>
                    <FormControl>
                      <Input placeholder="Pcs, Box, Rim" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStockAlert"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Stok Alert</FormLabel>
                    <FormControl>
                      {/* FIX: Casting value dan handle onChange manual */}
                      <Input
                        type="number"
                        {...field}
                        value={(field.value as string | number) ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Keterangan tambahan..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-8 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
              <FormField
                control={form.control}
                name="hasExpiry"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Memiliki Kadaluarsa?</FormLabel>
                      <FormDescription>
                        Aktifkan jika barang ini memiliki expired date.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Status Aktif</FormLabel>
                      <FormDescription>
                        Barang aktif dapat digunakan dalam transaksi.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

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

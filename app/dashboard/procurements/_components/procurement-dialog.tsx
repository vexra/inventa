'use client'

import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, FileText, Loader2, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { Textarea } from '@/components/ui/textarea'

import { createProcurement, updateProcurement } from '../actions'

const formSchema = z.object({
  description: z.string().min(3, 'Deskripsi wajib diisi (Min. 3 karakter)'),
  items: z
    .array(
      z.object({
        consumableId: z.string().min(1, 'Pilih barang'),
        quantity: z.coerce.number().min(1, 'Jumlah minimal 1'),
      }),
    )
    .min(1, 'Minimal tambahkan satu barang'),
})

interface ConsumableOption {
  id: string
  name: string
  unit: string
  hasExpiry: boolean
}

interface ProcurementDialogProps {
  consumables: ConsumableOption[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialData?: {
    id: string
    status: string
    description?: string | null
    notes?: string | null
    items: {
      consumableId: string
      quantity: string | number
    }[]
  } | null
  trigger?: React.ReactNode
}

export function ProcurementDialog({
  consumables,
  open: controlledOpen,
  onOpenChange,
  initialData,
  trigger,
}: ProcurementDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = !!initialData
  const isRejected = isEditMode && initialData?.status === 'REJECTED'

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || '',
      items: initialData?.items
        ? initialData.items.map((i) => ({
            consumableId: i.consumableId,
            quantity: Number(i.quantity),
          }))
        : [{ consumableId: '', quantity: 1 }],
    },
  })

  const currentItems = form.watch('items')

  useEffect(() => {
    if (isOpen) {
      form.reset({
        description: initialData?.description || '',
        items: initialData?.items
          ? initialData.items.map((i) => ({
              consumableId: i.consumableId,
              quantity: Number(i.quantity),
            }))
          : [{ consumableId: '', quantity: 1 }],
      })
    }
  }, [initialData, isOpen, form])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      let result
      if (isEditMode && initialData) {
        result = await updateProcurement(initialData.id, data)
      } else {
        result = await createProcurement(data)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditMode ? 'Pengajuan berhasil diperbarui' : 'Pengajuan berhasil dibuat')
        setOpen(false)
        if (!isEditMode) form.reset()
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Buat Pengajuan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-background flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="bg-background z-20 border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                {isEditMode ? <Pencil className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle>{isEditMode ? 'Edit Pengajuan' : 'Pengajuan Pengadaan'}</DialogTitle>
                <DialogDescription>
                  {isEditMode
                    ? 'Perbarui data pengajuan.'
                    : 'Formulir permintaan stok barang habis pakai.'}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="bg-background z-10 shrink-0 px-6 pt-6 pb-2">
              {isRejected && (
                <div className="mb-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">Pengajuan Ditolak</h4>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      Alasan: <span className="font-medium">{initialData.notes}</span>
                    </p>
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Silakan perbaiki data di bawah.
                    </p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="text-muted-foreground h-3.5 w-3.5" />
                      Judul / Deskripsi Pengadaan
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contoh: Pengadaan Semester Ganjil 2026/2027"
                        className="h-20 resize-none font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-5 flex items-center justify-between border-b pb-2">
                <h3 className="text-muted-foreground text-sm font-medium">Daftar Barang</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ consumableId: '', quantity: 1 })}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {fields.map((fieldItem, index) => {
                  const selectedIds = currentItems
                    .map((item, idx) => (idx !== index ? item.consumableId : null))
                    .filter(Boolean)

                  return (
                    <div
                      key={fieldItem.id}
                      className="group bg-card text-card-foreground relative flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition-colors hover:border-blue-400 sm:flex-row sm:items-start sm:gap-3"
                    >
                      <div className="flex items-center justify-between sm:hidden">
                        <span className="flex items-center gap-2 text-sm font-bold text-blue-600">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs dark:bg-blue-900">
                            {index + 1}
                          </span>
                          Barang ke-{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                        </Button>
                      </div>

                      <div className="bg-muted text-muted-foreground mt-9 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:flex">
                        {index + 1}
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.consumableId`}
                        render={({ field }) => (
                          <FormItem className="w-full flex-3">
                            <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                              Pilih Barang
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Cari item..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {consumables.map((c) => {
                                  if (selectedIds.includes(c.id)) return null

                                  return (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="font-medium">{c.name}</span>
                                      <span className="text-muted-foreground ml-2 text-xs">
                                        ({c.unit})
                                      </span>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-full sm:w-24">
                            <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                              Jumlah
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                className="text-center font-medium"
                                {...field}
                                value={(field.value as number) || ''}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground mt-7 hidden hover:bg-red-50 hover:text-red-600 sm:flex dark:hover:bg-red-900/20"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
                <div className="h-4" />
              </div>
            </div>

            <DialogFooter className="bg-background border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                  isRejected ? (
                    'Simpan & Ajukan Ulang'
                  ) : (
                    'Simpan Perubahan'
                  )
                ) : (
                  'Kirim Pengajuan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

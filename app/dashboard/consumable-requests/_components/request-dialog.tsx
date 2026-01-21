'use client'

import { useEffect, useMemo, useState } from 'react'
import { Control, useFieldArray, useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Warehouse,
} from 'lucide-react'
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

import { createRequest, updateRequest } from '../actions'

const formSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Pilih gudang tujuan'),
  roomId: z.string().min(1, 'Pilih ruangan tujuan'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        consumableId: z.string().min(1, 'Pilih barang'),
        quantity: z.coerce.number().min(1, 'Jumlah minimal 1'),
      }),
    )
    .min(1, 'Minimal satu barang'),
})

type RequestFormValues = z.infer<typeof formSchema>

export type WarehouseOption = {
  id: string
  name: string
}

export type RoomOption = {
  id: string
  name: string
}

export type StockOption = {
  warehouseId: string
  consumableId: string
  name: string
  unit: string
  quantity: string | number
}

interface RequestDialogProps {
  warehouses: WarehouseOption[]
  rooms: RoomOption[]
  stocks: StockOption[]
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  initialData?: RequestFormValues & { id: string }
  mode?: 'create' | 'edit'
}

interface RequestItemRowProps {
  index: number
  control: Control<RequestFormValues>
  remove: (index: number) => void
  isRemovable: boolean
  availableItems: StockOption[]
  watchedItems: { consumableId: string; quantity: number }[]
}

function RequestItemRow({
  index,
  control,
  remove,
  isRemovable,
  availableItems,
  watchedItems,
}: RequestItemRowProps) {
  const currentConsumableId = watchedItems[index]?.consumableId

  const filteredOptions = useMemo(() => {
    return availableItems.filter((item) => {
      const isSelectedElsewhere = watchedItems.some(
        (wItem, wIndex) => wItem.consumableId === item.consumableId && wIndex !== index,
      )
      return !isSelectedElsewhere
    })
  }, [availableItems, watchedItems, index])

  const selectedStock = availableItems.find((i) => i.consumableId === currentConsumableId)
  const maxQty = selectedStock ? Number(selectedStock.quantity) : 1

  return (
    <div className="group bg-card text-card-foreground relative flex flex-col items-start gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-start">
      <div className="bg-muted text-muted-foreground absolute top-4 -left-2 hidden h-5 w-5 -translate-x-1 items-center justify-center rounded-full text-[10px] font-bold shadow-sm sm:flex">
        {index + 1}
      </div>

      <div className="w-full flex-1 space-y-4">
        <FormField
          control={control}
          name={`items.${index}.consumableId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                Nama Barang
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue placeholder="Pilih item..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredOptions.length === 0 ? (
                    <div className="text-muted-foreground p-2 text-center text-xs">
                      {availableItems.length === 0
                        ? 'Stok Kosong di Gudang Ini'
                        : 'Semua jenis barang sudah dipilih'}
                    </div>
                  ) : (
                    filteredOptions.map((item) => (
                      <SelectItem key={item.consumableId} value={item.consumableId}>
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground text-xs">
                            (Stok: {Number(item.quantity)} {item.unit})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex w-full items-end gap-2 sm:w-auto">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className="w-full sm:w-28">
              <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                Jumlah {selectedStock && `(Max: ${maxQty})`}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={maxQty}
                  className="bg-background text-center font-medium"
                  {...field}
                  value={field.value === 0 ? '' : field.value}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') {
                      field.onChange('')
                      return
                    }
                    const parsedVal = parseInt(val)
                    if (parsedVal > maxQty) {
                      toast.warning(`Stok tersedia hanya ${maxQty}`)
                      field.onChange(maxQty)
                    } else {
                      field.onChange(parsedVal)
                    }
                  }}
                  onBlur={() => {
                    if (!field.value || Number(field.value) < 1) {
                      field.onChange(1)
                    }
                  }}
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
          className="text-muted-foreground mb-0.5 hover:bg-red-50 hover:text-red-600"
          onClick={() => remove(index)}
          disabled={!isRemovable}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function RequestDialog({
  warehouses = [],
  stocks = [],
  rooms = [],
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  initialData,
  mode = 'create',
}: RequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined

  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = (value: boolean) => {
    if (isControlled) {
      setControlledOpen?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetWarehouseId: '',
      roomId: '',
      notes: '',
      items: [{ consumableId: '', quantity: 1 }],
    },
  })

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        form.reset({
          targetWarehouseId: initialData.targetWarehouseId,
          roomId: initialData.roomId,
          notes: initialData.notes || '',
          items: initialData.items,
        })
      } else if (mode === 'create') {
        form.reset({
          targetWarehouseId: '',
          roomId: '',
          notes: '',
          items: [{ consumableId: '', quantity: 1 }],
        })
      }
    }
  }, [initialData, open, form, mode])

  const watchedItems = useWatch({
    control: form.control,
    name: 'items',
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const selectedWarehouseId = useWatch({
    control: form.control,
    name: 'targetWarehouseId',
  })

  const availableItems = useMemo(() => {
    if (!selectedWarehouseId) return []
    return stocks.filter((s) => s.warehouseId === selectedWarehouseId && Number(s.quantity) > 0)
  }, [selectedWarehouseId, stocks])

  async function onSubmit(values: RequestFormValues) {
    for (const item of values.items) {
      const stock = availableItems.find((s) => s.consumableId === item.consumableId)
      if (stock && item.quantity > Number(stock.quantity)) {
        toast.error(`Stok ${stock.name} tidak mencukupi (Tersedia: ${stock.quantity}).`)
        return
      }
    }

    setIsLoading(true)

    let res
    if (mode === 'edit' && initialData?.id) {
      res = await updateRequest(initialData.id, values)
    } else {
      res = await createRequest(values)
    }

    setIsLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
      setOpen(false)
      if (mode === 'create') form.reset()
    }
  }

  const handleWarehouseChange = (value: string) => {
    const currentWarehouse = form.getValues('targetWarehouseId')
    form.setValue('targetWarehouseId', value)

    if (value !== currentWarehouse) {
      replace([{ consumableId: '', quantity: 1 }])
    }
  }

  const dialogTitle = mode === 'edit' ? 'Edit Permintaan' : 'Buat Permintaan Barang'
  const dialogDescription =
    mode === 'edit'
      ? 'Ubah detail permintaan barang.'
      : 'Isi form untuk mengajukan permintaan baru.'
  const submitText = mode === 'edit' ? 'Simpan Perubahan' : 'Ajukan Permintaan'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <ShoppingCart className="mr-2 h-4 w-4" /> Buat Permintaan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-background flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="bg-background z-20 border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {mode === 'edit' ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="bg-background z-10 shrink-0 space-y-4 px-6 pt-6 pb-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground h-4 w-4" />
                        Untuk Ruangan
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Ruangan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.length === 0 ? (
                            <div className="text-muted-foreground p-2 text-center text-xs">
                              Unit tidak memiliki ruangan
                            </div>
                          ) : (
                            rooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
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
                  name="targetWarehouseId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="flex items-center gap-2">
                        <Warehouse className="text-muted-foreground h-4 w-4" />
                        Ambil dari Gudang
                      </FormLabel>
                      <Select onValueChange={handleWarehouseChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Gudang..." />
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
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="text-muted-foreground h-3.5 w-3.5" />
                      Keperluan / Catatan
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contoh: Untuk keperluan Praktikum..."
                        className="h-20 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-2 flex items-center justify-between border-b pb-2">
                <h3 className="text-muted-foreground text-sm font-medium">Daftar Barang</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ consumableId: '', quantity: 1 })}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  disabled={!selectedWarehouseId}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!selectedWarehouseId && (
                <div className="text-muted-foreground flex h-32 flex-col items-center justify-center text-sm italic">
                  <Warehouse className="mb-2 h-8 w-8 opacity-20" />
                  Pilih Gudang Sumber terlebih dahulu untuk melihat stok.
                </div>
              )}

              <div className="flex flex-col gap-3">
                {selectedWarehouseId &&
                  fields.map((fieldItem, index) => (
                    <RequestItemRow
                      key={fieldItem.id}
                      index={index}
                      control={form.control as unknown as Control<RequestFormValues>}
                      remove={remove}
                      isRemovable={fields.length > 1}
                      availableItems={availableItems}
                      watchedItems={watchedItems as { consumableId: string; quantity: number }[]}
                    />
                  ))}
              </div>
            </div>

            <DialogFooter className="bg-background z-20 border-t px-6 py-4">
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
                className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

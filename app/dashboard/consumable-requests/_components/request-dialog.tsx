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
  description: z.string().min(3, 'Keperluan wajib diisi (Min. 3 karakter)'),
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

export type WarehouseOption = { id: string; name: string }
export type RoomOption = { id: string; name: string }
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
  watchedItems: RequestFormValues['items']
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
    <div className="group bg-card text-card-foreground relative flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition-colors hover:border-blue-400 sm:flex-row sm:items-start sm:gap-3">
      <div className="bg-muted text-muted-foreground mt-9 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:flex">
        {index + 1}
      </div>

      <div className="flex-1">
        <FormField
          control={control}
          name={`items.${index}.consumableId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                Pilih Barang
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cari item..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredOptions.map((item) => (
                    <SelectItem key={item.consumableId} value={item.consumableId}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        (Stok: {item.quantity} {item.unit})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-end gap-2">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className="w-full sm:w-24">
              <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                Jumlah
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  className="text-center font-medium"
                  {...field}
                  onChange={(e) => {
                    const val = e.target.valueAsNumber || 0
                    field.onChange(val > maxQty ? maxQty : val)
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
          className="text-muted-foreground mt-7 hidden hover:bg-red-50 hover:text-red-600 sm:flex"
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
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  initialData,
  mode = 'create',
}: RequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = setControlledOpen || setInternalOpen
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetWarehouseId: '',
      roomId: '',
      description: '',
      items: [{ consumableId: '', quantity: 1 }],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const rawWatchedItems = useWatch({ control: form.control, name: 'items' })
  const watchedItems = useMemo(
    () => (rawWatchedItems || []) as RequestFormValues['items'],
    [rawWatchedItems],
  )

  const selectedWarehouseId = useWatch({ control: form.control, name: 'targetWarehouseId' })

  const availableItems = useMemo(() => {
    if (!selectedWarehouseId) return []
    return stocks.filter((s) => s.warehouseId === selectedWarehouseId && Number(s.quantity) > 0)
  }, [selectedWarehouseId, stocks])

  const isAllItemsSelected = useMemo(() => {
    return availableItems.length > 0 && watchedItems.length >= availableItems.length
  }, [availableItems, watchedItems])

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        form.reset(initialData)
      } else {
        form.reset({
          targetWarehouseId: '',
          roomId: '',
          description: '',
          items: [{ consumableId: '', quantity: 1 }],
        })
      }
    }
  }, [open, mode, initialData, form])

  async function onSubmit(values: RequestFormValues) {
    setIsLoading(true)
    const res =
      mode === 'edit' && initialData?.id
        ? await updateRequest(initialData.id, values)
        : await createRequest(values)

    setIsLoading(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success(res.message)
      setOpen(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || children || (
          <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Buat Permintaan
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
              <DialogTitle>
                {mode === 'edit' ? 'Edit Permintaan' : 'Buat Permintaan Barang'}
              </DialogTitle>
              <DialogDescription>
                Formulir pengajuan pengambilan barang dari gudang.
              </DialogDescription>
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
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Ruangan
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Ruangan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
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
                  name="targetWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4" /> Dari Gudang
                      </FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v)
                          replace([{ consumableId: '', quantity: 1 }])
                        }}
                        value={field.value}
                      >
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Keperluan
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Alasan permintaan barang..."
                        className="h-20 resize-none"
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
                  variant="secondary"
                  size="sm"
                  disabled={isAllItemsSelected || !selectedWarehouseId}
                  onClick={() => append({ consumableId: '', quantity: 1 })}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  {isAllItemsSelected ? 'Semua Stok Dipilih' : 'Tambah Baris'}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {selectedWarehouseId ? (
                  fields.map((fieldItem, index) => (
                    <RequestItemRow
                      key={fieldItem.id}
                      index={index}
                      control={form.control as unknown as Control<RequestFormValues>}
                      remove={remove}
                      isRemovable={fields.length > 1}
                      availableItems={availableItems}
                      watchedItems={watchedItems}
                    />
                  ))
                ) : (
                  <div className="text-muted-foreground flex h-32 flex-col items-center justify-center text-sm italic">
                    Pilih Gudang Sumber terlebih dahulu.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="bg-background border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : mode === 'edit' ? (
                  'Simpan Perubahan'
                ) : (
                  'Kirim Permintaan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

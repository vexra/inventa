'use client'

import { useMemo, useState } from 'react'
import { Control, useFieldArray, useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Loader2, Plus, ShoppingCart, Trash2, Warehouse } from 'lucide-react'
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

import { createRequest } from '../actions'

const formSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Pilih gudang tujuan'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        consumableId: z.string().min(1, 'Pilih barang'),
        quantity: z.coerce.number().min(1, 'Wajib diisi'),
      }),
    )
    .min(1, 'Minimal satu barang'),
})

type RequestFormValues = z.infer<typeof formSchema>

export type WarehouseOption = {
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
  stocks: StockOption[]
  children?: React.ReactNode
}

interface RequestItemRowProps {
  index: number
  control: Control<RequestFormValues>
  remove: (index: number) => void
  isRemovable: boolean
  availableItems: StockOption[]
}

function RequestItemRow({
  index,
  control,
  remove,
  isRemovable,
  availableItems,
}: RequestItemRowProps) {
  const currentConsumableId = useWatch({
    control,
    name: `items.${index}.consumableId`,
  })

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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih item..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableItems.length === 0 ? (
                    <div className="text-muted-foreground p-2 text-center text-xs">
                      Stok Kosong di Gudang Ini
                    </div>
                  ) : (
                    availableItems.map((item) => (
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
                Jumlah
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={maxQty}
                  className="bg-background text-center font-medium"
                  {...field}
                  value={(field.value as number) ?? ''}
                  onChange={(e) => {
                    const val = e.target.valueAsNumber
                    if (val > maxQty) {
                      toast.warning(`Stok tersedia hanya ${maxQty}`)
                      field.onChange(maxQty)
                    } else if (isNaN(val)) {
                      field.onChange(0)
                    } else {
                      field.onChange(val)
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

export function RequestDialog({ warehouses = [], stocks = [], children }: RequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetWarehouseId: '',
      notes: '',
      items: [{ consumableId: '', quantity: 1 }],
    },
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
    return stocks.filter((s) => s.warehouseId === selectedWarehouseId)
  }, [selectedWarehouseId, stocks])

  async function onSubmit(values: RequestFormValues) {
    setIsLoading(true)
    const res = await createRequest(values)
    setIsLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
      setOpen(false)
      form.reset()
    }
  }

  const handleWarehouseChange = (value: string) => {
    form.setValue('targetWarehouseId', value)
    replace([{ consumableId: '', quantity: 1 }])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
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
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Form Permintaan Barang</DialogTitle>
              <DialogDescription>
                Pilih gudang dan barang sesuai stok yang tersedia.
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
              <div className="rounded-lg border bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                <FormField
                  control={form.control}
                  name="targetWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                        <Warehouse className="h-4 w-4" />
                        Pilih Gudang Sumber
                      </FormLabel>
                      <Select onValueChange={handleWarehouseChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-blue-200 dark:border-blue-800">
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
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Ajukan Permintaan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Loader2, PackageOpen, Plus, Trash2 } from 'lucide-react'
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

import { createUsageReport } from '../actions'

const formSchema = z.object({
  activityName: z.string().min(1, 'Nama kegiatan wajib diisi'),
  items: z
    .array(
      z.object({
        consumableId: z.string().min(1, 'Pilih barang'),
        quantity: z.coerce.number().min(1, 'Wajib diisi'),
      }),
    )
    .min(1, 'Minimal satu barang'),
})

type UsageFormValues = z.infer<typeof formSchema>

export type RoomStockOption = {
  consumableId: string
  name: string
  unit: string
  currentQty: number
}

export function UsageDialog({ stocks }: { stocks: RoomStockOption[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: '',
      items: [{ consumableId: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchedItems = useWatch({
    control: form.control,
    name: 'items',
  })

  async function onSubmit(values: UsageFormValues) {
    setIsLoading(true)
    const res = await createUsageReport(values)
    setIsLoading(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
      setOpen(false)
      form.reset()
    }
  }

  const getMaxStock = (id: string) => stocks.find((s) => s.consumableId === id)?.currentQty || 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
          <ClipboardList className="mr-2 h-4 w-4" /> Lapor Pemakaian
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-background flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="bg-background z-20 border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Lapor Pemakaian Barang</DialogTitle>
              <DialogDescription>
                Laporkan barang yang telah digunakan. Stok ruangan akan berkurang otomatis.
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
              <FormField
                control={form.control}
                name="activityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kegiatan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Praktikum Modul 1 / Pembersihan Rutin"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-2 flex items-center justify-between border-b pb-2">
                <h3 className="text-muted-foreground text-sm font-medium">Barang yang Dipakai</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ consumableId: '', quantity: 1 })}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {stocks.length === 0 ? (
                <div className="text-muted-foreground flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-sm italic">
                  Stok ruangan Anda kosong. Tidak ada yang bisa dilaporkan.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {fields.map((fieldItem, index) => {
                    const currentItemId = watchedItems?.[index]?.consumableId
                    const maxQty = getMaxStock(currentItemId || '')

                    return (
                      <div
                        key={fieldItem.id}
                        className="group bg-card relative flex flex-col items-start gap-4 rounded-lg border p-4 shadow-sm transition-colors hover:border-blue-400 sm:flex-row sm:items-start"
                      >
                        <div className="bg-muted text-muted-foreground absolute top-4 -left-2 hidden h-5 w-5 -translate-x-1 items-center justify-center rounded-full text-[10px] font-bold shadow-sm sm:flex">
                          {index + 1}
                        </div>

                        <div className="w-full flex-1 space-y-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.consumableId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Nama Barang</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih stok..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {stocks.map((s) => (
                                      <SelectItem key={s.consumableId} value={s.consumableId}>
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">
                                          (Sisa: {s.currentQty} {s.unit})
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

                        <div className="flex w-full items-start gap-2 sm:w-auto">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="w-full sm:w-24">
                                <FormLabel className="text-xs">Jumlah</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={maxQty || 9999}
                                    className="text-center font-medium"
                                    {...field}
                                    value={(field.value as number) || ''}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                  />
                                </FormControl>
                                <div className="text-muted-foreground text-center text-[10px]">
                                  Max: {maxQty}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground mt-6 hover:text-red-600"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan Laporan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

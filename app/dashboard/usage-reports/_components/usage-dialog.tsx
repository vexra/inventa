'use client'

import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Activity,
  ClipboardList,
  Loader2,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  Trash2,
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

import { createUsageReport, updateUsageReport } from '../actions'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Jumlah minimal 1'),
})

const formSchema = z.object({
  roomId: z.string().min(1, 'Pilih ruangan'),
  activityName: z.string().min(3, 'Nama kegiatan wajib diisi (Min. 3 karakter)'),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

interface AvailableStockOption {
  id: string
  name: string
  unit: string
  currentQty: number
  roomId: string
}

interface RoomOption {
  id: string
  name: string
}

interface InitialData {
  id: string
  roomId: string
  activityName: string
  items: {
    consumableId: string
    quantity: number
  }[]
}

interface UsageDialogProps {
  rooms: RoomOption[]
  availableStocks: AvailableStockOption[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialData?: InitialData
  trigger?: React.ReactNode
}

export function UsageDialog({
  rooms,
  availableStocks,
  open: controlledOpen,
  onOpenChange,
  initialData,
  trigger,
}: UsageDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = !!initialData

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      activityName: '',
      items: [{ consumableId: '', quantity: 1 }],
    },
  })

  const selectedRoomId = useWatch({ control: form.control, name: 'roomId' })
  const currentItems = useWatch({ control: form.control, name: 'items' })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          roomId: initialData.roomId,
          activityName: initialData.activityName,
          items: initialData.items,
        })
      } else {
        form.reset({
          roomId: '',
          activityName: '',
          items: [{ consumableId: '', quantity: 1 }],
        })
      }
    }
  }, [isOpen, initialData, form])

  const filteredStocks = availableStocks.filter((stock) => stock.roomId === selectedRoomId)

  const isLoading = form.formState.isSubmitting
  const isAllItemsSelected =
    filteredStocks.length > 0 && currentItems.length >= filteredStocks.length

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      let result
      if (isEditMode && initialData) {
        result = await updateUsageReport({ reportId: initialData.id, ...values })
      } else {
        result = await createUsageReport(values)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setOpen(false)
        if (!isEditMode) form.reset()
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  const getStockInfo = (consumableId: string) => {
    return filteredStocks.find((s) => s.id === consumableId)
  }

  const handleRoomChange = (newRoomId: string) => {
    form.setValue('roomId', newRoomId)
    if (newRoomId !== initialData?.roomId) {
      replace([{ consumableId: '', quantity: 1 }])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Lapor Pemakaian
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-background flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="bg-background z-20 border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {isEditMode ? <Pencil className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>
                {isEditMode ? 'Edit Laporan Pemakaian' : 'Catat Pemakaian Barang'}
              </DialogTitle>
              <DialogDescription>Pilih ruangan dan catat barang yang digunakan.</DialogDescription>
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
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                      Lokasi Ruangan
                    </FormLabel>
                    <Select
                      onValueChange={handleRoomChange}
                      value={field.value}
                      disabled={isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih ruangan..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
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
                name="activityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Activity className="text-muted-foreground h-3.5 w-3.5" />
                      Nama Kegiatan
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Praktikum Kimia Dasar"
                        className="font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between border-b pt-2 pb-2">
                <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <PackageOpen className="h-4 w-4" />
                  Daftar Barang
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isAllItemsSelected || !selectedRoomId}
                  onClick={() => append({ consumableId: '', quantity: 1 })}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Tambah Barang
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!selectedRoomId ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <MapPin className="text-muted-foreground h-8 w-8 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    Silakan pilih ruangan terlebih dahulu.
                  </p>
                </div>
              ) : (
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Cari barang..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredStocks.length === 0 ? (
                                    <div className="text-muted-foreground p-2 text-center text-xs">
                                      Tidak ada stok.
                                    </div>
                                  ) : (
                                    filteredStocks.map((stock) => {
                                      if (selectedIds.includes(stock.id)) return null
                                      const isOutOfStock = stock.currentQty <= 0
                                      const isSelected = field.value === stock.id
                                      const isDisabled = isOutOfStock && !isSelected

                                      return (
                                        <SelectItem
                                          key={stock.id}
                                          value={stock.id}
                                          disabled={isDisabled}
                                          className={isDisabled ? 'opacity-50' : ''}
                                        >
                                          <div className="flex w-full items-center justify-between gap-2">
                                            <span className="font-medium">{stock.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                              (Sisa: {stock.currentQty} {stock.unit})
                                            </span>
                                          </div>
                                        </SelectItem>
                                      )
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => {
                            const selectedId = currentItems[index]?.consumableId
                            const stockInfo = getStockInfo(selectedId)
                            const maxQty = stockInfo?.currentQty || 9999

                            return (
                              <FormItem className="w-full sm:w-28">
                                <FormLabel className="text-muted-foreground mb-1.5 block text-xs font-normal">
                                  Jumlah
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={maxQty}
                                    className="text-center font-medium"
                                    {...field}
                                    value={(field.value as number) || ''}
                                    onChange={(e) => {
                                      const val = e.target.valueAsNumber
                                      field.onChange(isNaN(val) ? '' : val)
                                    }}
                                  />
                                </FormControl>
                                {stockInfo && (
                                  <p className="text-muted-foreground text-[10px]">
                                    Max: {maxQty} {stockInfo.unit}
                                  </p>
                                )}
                                <FormMessage />
                              </FormItem>
                            )
                          }}
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
              )}
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
                disabled={isLoading || !selectedRoomId}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Laporan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

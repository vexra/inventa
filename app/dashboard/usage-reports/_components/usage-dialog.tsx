'use client'

import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Activity,
  CalendarIcon,
  ClipboardList,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { createUsageReport, updateUsageReport } from '../actions'

const itemSchema = z.object({
  roomConsumableId: z.string().min(1, 'Pilih barang/batch'),
  quantity: z.coerce.number().min(1, 'Jumlah minimal 1'),
})

const formSchema = z.object({
  roomId: z.string().min(1, 'Pilih ruangan'),
  activityName: z.string().min(3, 'Nama kegiatan wajib diisi (Min. 3 karakter)'),
  activityDate: z.date('Tanggal kegiatan wajib diisi'),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

interface AvailableStockOption {
  id: string
  consumableId: string
  name: string
  unit: string
  currentQty: number
  roomId: string
  batchNumber: string | null
  expiryDate: Date | null
}

interface RoomOption {
  id: string
  name: string
}

interface InitialData {
  id: string
  roomId: string
  activityName: string
  activityDate: Date
  items: {
    roomConsumableId: string
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
      activityDate: new Date(),
      items: [{ roomConsumableId: '', quantity: 1 }],
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
          activityDate: new Date(initialData.activityDate),
          items: initialData.items,
        })
      } else {
        form.reset({
          roomId: rooms.length === 1 ? rooms[0].id : '',
          activityName: '',
          activityDate: new Date(),
          items: [{ roomConsumableId: '', quantity: 1 }],
        })
      }
    }
  }, [isOpen, initialData, form, rooms])

  const filteredStocks = availableStocks.filter((stock) => stock.roomId === selectedRoomId)

  const isLoading = form.formState.isSubmitting

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

  const getStockInfo = (rcId: string) => {
    return filteredStocks.find((s) => s.id === rcId)
  }

  const handleRoomChange = (newRoomId: string) => {
    form.setValue('roomId', newRoomId)
    if (newRoomId !== initialData?.roomId || !isEditMode) {
      replace([{ roomConsumableId: '', quantity: 1 }])
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
              <DialogDescription>Pilih ruangan dan batch barang yang digunakan.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="bg-background z-10 shrink-0 border-b shadow-sm">
              <div className="space-y-4 px-6 pt-6 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                              <SelectValue placeholder="Pilih Ruangan" />
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

                  {/* Field Activity Date */}
                  <FormField
                    control={form.control}
                    name="activityDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="mb-2 flex items-center gap-2">
                          <CalendarIcon className="text-muted-foreground h-3.5 w-3.5" />
                          Tanggal Kegiatan
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd MMMM yyyy', { locale: idLocale })
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                        <Input placeholder="Contoh: Praktikum Kimia Dasar Modul 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/20 flex items-center justify-between border-t px-6 py-3">
                <FormLabel className="text-muted-foreground text-sm font-semibold">
                  Daftar Barang ({fields.length})
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-background hover:bg-muted"
                  onClick={() => append({ roomConsumableId: '', quantity: 1 })}
                  disabled={!selectedRoomId || fields.length >= filteredStocks.length}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Barang
                </Button>
              </div>
            </div>

            {/* Bagian List Barang (Tidak berubah banyak) */}
            <div className="bg-muted/5 flex-1 overflow-y-auto px-6 py-4">
              {!selectedRoomId ? (
                <div className="bg-background flex h-32 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-muted-foreground text-sm">
                    Silakan pilih ruangan terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {fields.map((fieldItem, index) => {
                    const allSelectedIds = currentItems
                      .map((item) => item.roomConsumableId)
                      .filter(Boolean)
                    const currentSelectedId = currentItems[index]?.roomConsumableId
                    const rowOptions = filteredStocks.filter(
                      (stock) =>
                        !allSelectedIds.includes(stock.id) || stock.id === currentSelectedId,
                    )

                    return (
                      <div
                        key={fieldItem.id}
                        className="group bg-card text-card-foreground relative flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition-colors hover:border-blue-400 sm:flex-row sm:items-start sm:gap-3"
                      >
                        <div className="flex items-center justify-between sm:hidden">
                          <span className="flex items-center gap-2 text-sm font-bold text-blue-600">
                            #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:bg-red-50"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <span className="mt-3 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 sm:flex dark:bg-blue-900 dark:text-blue-300">
                          {index + 1}
                        </span>

                        <div className="grid flex-1 gap-4 sm:grid-cols-12">
                          <FormField
                            control={form.control}
                            name={`items.${index}.roomConsumableId`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-8">
                                <FormLabel className="sr-only">Barang</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Pilih barang..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-62.5">
                                    {rowOptions.length === 0 ? (
                                      <div className="text-muted-foreground p-3 text-center text-sm">
                                        {filteredStocks.length === 0
                                          ? 'Stok kosong'
                                          : 'Semua item sudah dipilih'}
                                      </div>
                                    ) : (
                                      rowOptions.map((stock) => (
                                        <SelectItem key={stock.id} value={stock.id}>
                                          <span className="flex w-full items-center truncate text-sm">
                                            <span className="text-foreground mr-1 font-semibold">
                                              {stock.name}
                                            </span>
                                            <span className="text-muted-foreground/50 mx-2">•</span>
                                            <span className="text-muted-foreground">
                                              Sisa: {stock.currentQty} {stock.unit}
                                            </span>
                                            {stock.batchNumber && (
                                              <>
                                                <span className="text-muted-foreground/50 mx-2">
                                                  •
                                                </span>
                                                <span className="text-muted-foreground">
                                                  Batch: {stock.batchNumber}
                                                </span>
                                              </>
                                            )}
                                            {stock.expiryDate && (
                                              <>
                                                <span className="text-muted-foreground/50 mx-2">
                                                  •
                                                </span>
                                                <span className="text-muted-foreground">
                                                  Exp:{' '}
                                                  {format(new Date(stock.expiryDate), 'dd/MM/yy')}
                                                </span>
                                              </>
                                            )}
                                          </span>
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
                            name={`items.${index}.quantity`}
                            render={({ field }) => {
                              const selectedId = currentItems[index]?.roomConsumableId
                              const stockInfo = getStockInfo(selectedId)
                              return (
                                <FormItem className="sm:col-span-4">
                                  <FormLabel className="sr-only">Jumlah</FormLabel>
                                  <div className="flex items-center gap-3">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={stockInfo ? stockInfo.currentQty : undefined}
                                        placeholder="0"
                                        {...field}
                                        value={(field.value as number) ?? ''}
                                        onChange={(e) => field.onChange(e)}
                                      />
                                    </FormControl>
                                    <span className="text-muted-foreground min-w-12 text-sm font-medium whitespace-nowrap">
                                      {stockInfo?.unit || '-'}
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )
                            }}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground mt-0 hidden hover:bg-red-50 hover:text-red-600 sm:flex dark:hover:bg-red-900/20"
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

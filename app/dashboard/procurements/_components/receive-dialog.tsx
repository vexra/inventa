'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { CalendarIcon, Loader2, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { type GoodsReceiptFormValues, goodsReceiptSchema } from '@/lib/validations/inbound'

import { processGoodsReceipt } from '../actions'

const CONDITION_LABELS: Record<string, string> = {
  GOOD: '✅ Baik / Lengkap',
  DAMAGED: '❌ Rusak / Cacat',
  INCOMPLETE: '⚠️ Tidak Lengkap',
}

const CONDITION_STYLES: Record<string, string> = {
  GOOD: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  DAMAGED: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  INCOMPLETE: 'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
}

interface ProcurementItem {
  id: string
  consumableId: string
  quantity: string | number
  unit: string | null
  consumable: {
    name: string
    hasExpiry: boolean
  }
}

interface ReceiveDialogProps {
  procurement: {
    id: string
    code: string
    items: ProcurementItem[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceiveDialog({ procurement, open, onOpenChange }: ReceiveDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<GoodsReceiptFormValues>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      procurementId: procurement.id,
      items: procurement.items.map((item) => ({
        itemId: item.id,
        consumableId: item.consumableId,
        quantity: Number(item.quantity),
        hasExpiry: item.consumable.hasExpiry,
        condition: 'GOOD',
        batchNumber: '',
        expiryDate: '',
        notes: '',
      })),
    },
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  async function onSubmit(values: GoodsReceiptFormValues) {
    setIsLoading(true)
    try {
      const res = await processGoodsReceipt(values)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
        onOpenChange(false)
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="bg-background z-10 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-blue-600" />
            Penerimaan Barang: {procurement.code}
          </DialogTitle>
          <DialogDescription>
            Lakukan pengecekan fisik (QC). Item bertanda (<span className="text-red-500">*</span>)
            wajib memiliki data lengkap.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-6 dark:bg-slate-900/10">
              <div className="space-y-6">
                {fields.map((field, index) => {
                  const originalItem = procurement.items.find((i) => i.id === field.itemId)
                  const currentCondition = form.watch(`items.${index}.condition`) as string

                  const isExpiryRequired = form.watch(`items.${index}.hasExpiry`)

                  const expiryError = form.formState.errors.items?.[index]?.expiryDate
                  const batchError = form.formState.errors.items?.[index]?.batchNumber

                  return (
                    <div
                      key={field.id}
                      className="bg-background rounded-lg border p-4 shadow-sm transition-all hover:border-blue-300"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {index + 1}
                            </span>
                            <h4 className="text-foreground text-sm font-bold">
                              {originalItem?.consumable.name || 'Unknown Item'}
                            </h4>
                          </div>
                          <div className="text-muted-foreground mt-1 ml-8 text-xs">
                            Pesanan:{' '}
                            <span className="text-foreground font-mono font-medium">
                              {originalItem?.quantity}
                            </span>{' '}
                            {originalItem?.unit}
                          </div>
                        </div>

                        <Badge
                          className={`px-3 py-1 text-xs font-medium ${CONDITION_STYLES[currentCondition]}`}
                        >
                          {CONDITION_LABELS[currentCondition]}
                        </Badge>
                      </div>

                      <Separator className="mb-4 opacity-50" />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.condition`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                Kondisi Fisik
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background h-9">
                                    <SelectValue placeholder="Pilih Kondisi" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.keys(CONDITION_LABELS).map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {CONDITION_LABELS[c]}
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
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                Jml Diterima
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  className="bg-background h-9 font-mono"
                                  onChange={(e) => {
                                    const val = e.target.valueAsNumber
                                    field.onChange(isNaN(val) ? 0 : val)
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.batchNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold uppercase">
                                No. Batch / Lot
                                {isExpiryRequired && (
                                  <span className="text-sm text-red-600">*</span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={isExpiryRequired ? 'Wajib diisi...' : 'Opsional'}
                                  className={`bg-background h-9 ${
                                    batchError
                                      ? 'border-red-500 ring-red-500 focus-visible:ring-red-500'
                                      : ''
                                  }`}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {isExpiryRequired ? (
                          <FormField
                            control={form.control}
                            name={`items.${index}.expiryDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold uppercase">
                                  Kadaluarsa
                                  <span className="text-sm text-red-600">*</span>
                                </FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'bg-background h-9 w-full pl-3 text-left font-normal',
                                          !field.value && 'text-muted-foreground',
                                          expiryError &&
                                            'border-red-500 text-red-500 ring-red-500 focus-visible:ring-red-500',
                                        )}
                                      >
                                        {field.value ? (
                                          format(new Date(field.value), 'P', { locale: idLocale })
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
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => {
                                        const formatted = date ? format(date, 'yyyy-MM-dd') : ''
                                        field.onChange(formatted)
                                      }}
                                      disabled={(date) => date < new Date('1900-01-01')}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="hidden lg:block"></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="bg-background border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-37.5 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi Masuk
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

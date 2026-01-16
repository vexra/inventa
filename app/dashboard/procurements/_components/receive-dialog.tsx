'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { receiptConditionEnum } from '@/db/schema'
import { type GoodsReceiptFormValues, goodsReceiptSchema } from '@/lib/validations/inbound'

import { processGoodsReceipt } from '../actions'

const CONDITION_LABELS: Record<(typeof receiptConditionEnum.enumValues)[number], string> = {
  GOOD: '✅ Baik / Lengkap',
  DAMAGED: '❌ Rusak / Cacat',
  INCOMPLETE: '⚠️ Tidak Lengkap',
}

const CONDITION_COLORS: Record<
  (typeof receiptConditionEnum.enumValues)[number],
  'default' | 'destructive' | 'secondary'
> = {
  GOOD: 'default',
  DAMAGED: 'destructive',
  INCOMPLETE: 'secondary',
}

// --- PERBAIKAN TIPE DATA DI SINI ---
interface ProcurementItem {
  id: string
  consumableId: string
  consumableName: string | null
  unit: string | null
  quantity: string | number
}

interface ReceiveDialogProps {
  procurement: {
    id: string
    code: string
    items: ProcurementItem[]
  }
  // Props wajib untuk Controlled Component
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceiveDialog({ procurement, open, onOpenChange }: ReceiveDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      procurementId: procurement.id,
      items: procurement.items.map((item) => ({
        itemId: item.id,
        consumableId: item.consumableId,
        quantity: Number(item.quantity),
        condition: receiptConditionEnum.enumValues[0],
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
        onOpenChange(false) // Menutup dialog via props
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem saat memproses penerimaan.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // Menggunakan open & onOpenChange dari props, bukan state internal
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Penerimaan Barang: {procurement.code}</DialogTitle>
          <DialogDescription>
            Lakukan pengecekan fisik (QC). Input No. Batch dan Tanggal Kadaluarsa (jika ada).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => {
                const originalItem = procurement.items.find((i) => i.id === field.itemId)

                // Watch nilai kondisi untuk update badge warna secara realtime
                const currentCondition = form.watch(`items.${index}.condition`)

                return (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50"
                  >
                    {/* Header Card Item */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-foreground text-sm font-bold">
                          {index + 1}. {originalItem?.consumableName || 'Unknown Item'}
                        </h4>
                        <span className="text-muted-foreground text-xs">
                          Order Qty:{' '}
                          <span className="font-mono font-medium">{originalItem?.quantity}</span>{' '}
                          {originalItem?.unit}
                        </span>
                      </div>
                      <Badge variant={CONDITION_COLORS[currentCondition] ?? 'outline'}>
                        {currentCondition}
                      </Badge>
                    </div>

                    <Separator className="mb-4" />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                      {/* 1. Kondisi Fisik (Dynamic Select) */}
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.condition`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                Kondisi (QC)
                              </FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background h-9">
                                    <SelectValue placeholder="Pilih" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {receiptConditionEnum.enumValues.map((condition) => (
                                    <SelectItem key={condition} value={condition}>
                                      {CONDITION_LABELS[condition]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 2. Jumlah Diterima */}
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                Jml Masuk
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  className="bg-background h-9 font-mono"
                                  value={(field.value as number) ?? ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 3. Batch Number */}
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.batchNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                No. Batch / Lot
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Contoh: B-2024"
                                  className="bg-background h-9"
                                  value={(field.value as string) ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 4. Expired Date */}
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.expiryDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-muted-foreground text-[10px] font-bold uppercase">
                                Tanggal Kadaluarsa
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type="date"
                                    className="bg-background block h-9 pl-9"
                                    value={(field.value as string) ?? ''}
                                  />
                                  <CalendarIcon className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <DialogFooter className="bg-background sticky bottom-0 z-10 -mx-6 mt-6 border-t px-6 py-4">
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

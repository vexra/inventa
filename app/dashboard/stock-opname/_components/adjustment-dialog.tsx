'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { AlertTriangle, Loader2, Package, Save } from 'lucide-react'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StockOpnameFormValues, stockOpnameSchema } from '@/lib/validations/stock-opname'

import { submitStockOpname } from '../actions'

interface BatchData {
  id: string
  batchNumber: string | null
  quantity: number
  expiryDate: Date | null
}

interface AdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consumableName: string
  consumableId: string
  unit: string
  batches: BatchData[]
}

const ADJUSTMENT_TYPES = [
  { value: 'STOCK_OPNAME', label: 'Stock Opname (Rutin)' },
  { value: 'DAMAGE', label: 'Barang Rusak / Kadaluarsa' },
  { value: 'LOSS', label: 'Barang Hilang' },
  { value: 'CORRECTION', label: 'Koreksi Admin (Salah Input)' },
]

export function AdjustmentDialog({
  open,
  onOpenChange,
  consumableName,
  consumableId,
  unit,
  batches,
}: AdjustmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const { activeBatches, zeroBatches } = useMemo(() => {
    const sorted = [...batches].sort((a, b) => {
      if (!a.expiryDate) return 1
      if (!b.expiryDate) return -1
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    })

    const active = sorted.filter((b) => Number(b.quantity) > 0)
    const zero = sorted.filter((b) => Number(b.quantity) <= 0)

    return { activeBatches: active, zeroBatches: zero }
  }, [batches])

  const allSortedBatches = useMemo(
    () => [...activeBatches, ...zeroBatches],
    [activeBatches, zeroBatches],
  )

  const form = useForm({
    resolver: zodResolver(stockOpnameSchema),
    defaultValues: {
      consumableId,
      warehouseStockId: '',
      physicalQty: 0,
      type: 'STOCK_OPNAME',
      reason: '',
    },
  })

  const selectedBatchId = useWatch({ control: form.control, name: 'warehouseStockId' })
  const physicalQty = useWatch({ control: form.control, name: 'physicalQty' }) as number
  const selectedType = useWatch({ control: form.control, name: 'type' })

  const activeBatch = useMemo(() => {
    return allSortedBatches.find((b) => b.id === selectedBatchId)
  }, [allSortedBatches, selectedBatchId])

  const systemQty = activeBatch ? activeBatch.quantity : 0
  const delta = activeBatch ? Number(physicalQty) - systemQty : 0

  useEffect(() => {
    if (open) {
      const defaultBatch =
        activeBatches.length === 1 && zeroBatches.length === 0 ? activeBatches[0] : null

      form.reset({
        consumableId,
        warehouseStockId: defaultBatch ? defaultBatch.id : '',
        physicalQty: defaultBatch ? defaultBatch.quantity : 0,
        type: 'STOCK_OPNAME',
        reason: '',
      })
    }
  }, [open, consumableId, activeBatches, zeroBatches, form])

  useEffect(() => {
    if (activeBatch) {
      const currentVal = form.getValues('physicalQty')
      if (currentVal !== activeBatch.quantity) {
        form.setValue('physicalQty', activeBatch.quantity)
      }
    }
  }, [activeBatch, form])

  async function onSubmit(values: StockOpnameFormValues) {
    setIsLoading(true)
    try {
      const res = await submitStockOpname(values)
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

  const renderBatchItem = (batch: BatchData, isZero: boolean) => {
    const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date()
    return (
      <SelectItem key={batch.id} value={batch.id} className="cursor-pointer">
        <div className={`flex flex-col text-left ${isZero ? 'opacity-70' : ''}`}>
          <span className="font-medium">Batch: {batch.batchNumber || 'Tanpa Batch'}</span>
          <div className="text-muted-foreground flex gap-2 text-xs">
            <span className={isZero ? 'font-medium text-red-500' : ''}>
              Stok: {batch.quantity} {unit}
            </span>
            {batch.expiryDate && (
              <span className={isExpired ? 'font-bold text-red-500' : ''}>
                • Exp: {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
              </span>
            )}
          </div>
        </div>
      </SelectItem>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
          <DialogDescription>{consumableName}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="warehouseStockId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih Batch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-auto w-full py-4 text-left">
                        <SelectValue placeholder="Pilih batch yang akan disesuaikan..." />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent
                      position="popper"
                      className="z-200 max-h-50 w-(--radix-select-trigger-width) overflow-y-auto"
                      sideOffset={5}
                    >
                      {activeBatches.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-primary px-2 py-1.5 text-xs font-bold">
                            Stok Tersedia ({activeBatches.length})
                          </SelectLabel>
                          {activeBatches.map((batch) => renderBatchItem(batch, false))}
                        </SelectGroup>
                      )}

                      {activeBatches.length > 0 && zeroBatches.length > 0 && (
                        <SelectSeparator className="my-2" />
                      )}

                      {zeroBatches.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-muted-foreground px-2 py-1.5 text-xs font-semibold">
                            Riwayat / Stok Habis ({zeroBatches.length})
                          </SelectLabel>
                          {zeroBatches.map((batch) => renderBatchItem(batch, true))}
                        </SelectGroup>
                      )}

                      {activeBatches.length === 0 && zeroBatches.length === 0 && (
                        <div className="text-muted-foreground p-4 text-center text-sm">
                          Tidak ada data batch.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activeBatch ? (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-4 duration-300">
                <div className="bg-muted/40 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Stok Sistem</span>
                      <span className="font-mono text-xl font-bold">{systemQty}</span>
                    </div>
                    <div className="text-muted-foreground pb-2">→</div>
                    <div className="flex flex-col items-end">
                      <span className="text-muted-foreground text-xs">Stok Fisik</span>
                      <span
                        className={`font-mono text-xl font-bold ${
                          delta !== 0 ? 'text-blue-600' : ''
                        }`}
                      >
                        {Number(physicalQty)}
                      </span>
                    </div>
                    <div className="ml-4 flex min-w-20 flex-col items-end border-l pl-4">
                      <span className="text-muted-foreground text-xs">Selisih</span>
                      <Badge
                        variant="outline"
                        className={`${
                          delta === 0
                            ? 'text-muted-foreground'
                            : delta > 0
                              ? 'border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'border-red-200 bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="physicalQty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah Fisik (Aktual)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="text-lg font-bold"
                            {...field}
                            value={(field.value as number) ?? ''}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') {
                                e.preventDefault()
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.valueAsNumber
                              if (isNaN(val) || val < 0) {
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

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Penyesuaian</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="z-200 max-h-50">
                            {ADJUSTMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keterangan / Alasan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Jelaskan alasan ${
                            activeBatch?.batchNumber ? `untuk batch ${activeBatch.batchNumber}` : ''
                          }...`}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {delta !== 0 && (
                  <div
                    className={`flex gap-3 rounded-md border p-3 text-sm ${
                      delta < 0
                        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200'
                        : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 shrink-0 ${
                        delta < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    />
                    <div>
                      <p className="font-semibold">Konfirmasi Perubahan</p>
                      <p className="mt-1 text-xs opacity-90">
                        Stok akan {delta > 0 ? 'ditambah' : 'dikurangi'} sebanyak{' '}
                        <b>
                          {Math.abs(delta)} {unit}
                        </b>{' '}
                        dengan tipe{' '}
                        <b>{ADJUSTMENT_TYPES.find((t) => t.value === selectedType)?.label}</b>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted/20 flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <Package className="text-muted-foreground/50 mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">Silakan pilih batch terlebih dahulu</p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-input hover:bg-accent hover:text-accent-foreground"
              >
                Batal
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !selectedBatchId || delta === 0}
                className={`text-white transition-colors ${
                  delta < 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

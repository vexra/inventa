'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calculator,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  PackageOpen,
  Save,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { stockOpnameSchema } from '@/lib/validations/stock-opname'

import { submitStockOpname } from '../actions'

type StockOpnameFormValues = z.infer<typeof stockOpnameSchema>

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

// PERBAIKAN: Menghapus properti warna agar tampilan standar
const ADJUSTMENT_TYPES = [
  { value: 'STOCK_OPNAME', label: 'Stock Opname (Rutin)' },
  { value: 'CORRECTION', label: 'Koreksi Data (Admin)' },
  { value: 'DAMAGE', label: 'Barang Rusak (Damage)' },
  { value: 'LOSS', label: 'Barang Hilang (Loss)' },
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

  const form = useForm({
    resolver: zodResolver(stockOpnameSchema),
    defaultValues: {
      consumableId,
      warehouseStockId: '',
      physicalQty: 0,
      reason: '',
      type: 'STOCK_OPNAME',
    },
  })

  const selectedBatchId = useWatch({ control: form.control, name: 'warehouseStockId' })
  const physicalQtyRaw = useWatch({ control: form.control, name: 'physicalQty' })

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId],
  )

  const systemQty = selectedBatch?.quantity || 0
  const delta = (Number(physicalQtyRaw) || 0) - systemQty

  // Reset form saat dialog dibuka
  useEffect(() => {
    if (open) {
      form.reset({
        consumableId,
        warehouseStockId: batches.length === 1 ? batches[0].id : '',
        physicalQty: batches.length === 1 ? batches[0].quantity : 0,
        reason: '',
        type: 'STOCK_OPNAME',
      })
    }
  }, [open, consumableId, batches, form])

  useEffect(() => {
    if (selectedBatch) {
      form.setValue('physicalQty', selectedBatch.quantity)
    }
  }, [selectedBatch, form])

  useEffect(() => {
    if (delta === 0) {
      form.setValue('type', 'STOCK_OPNAME')
    } else if (delta < 0) {
      // Logic optional
    } else if (delta > 0) {
      form.setValue('type', 'STOCK_OPNAME')
    }
  }, [delta, form])

  async function onSubmit(values: StockOpnameFormValues) {
    setIsLoading(true)
    try {
      const payload = {
        ...values,
        type: values.type as 'STOCK_OPNAME' | 'DAMAGE' | 'LOSS' | 'CORRECTION',
      }

      const result = await submitStockOpname(payload)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        onOpenChange(false)
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* HEADER */}
        <DialogHeader className="bg-muted/30 dark:bg-muted/10 shrink-0 border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Scale className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                Stok Opname
              </DialogTitle>
              <DialogDescription className="mt-1">
                Sesuaikan stok fisik dengan sistem.
              </DialogDescription>
            </div>

            <Badge
              variant="outline"
              className="mt-1 mr-8 shrink-0 px-3 py-1 text-sm font-bold uppercase"
            >
              Satuan: {unit}
            </Badge>
          </div>

          <div className="bg-background dark:bg-muted/20 mt-3 flex items-center gap-3 rounded-lg border p-3 shadow-sm">
            <div className="shrink-0 rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <PackageOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="overflow-hidden">
              <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
                Barang
              </span>
              <p className="truncate text-sm leading-tight font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                {consumableName}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY (Scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6">
            <Form {...form}>
              <form id="opname-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 1. Pilih Batch */}
                <div className="bg-muted/30 dark:bg-muted/10 rounded-lg border p-4">
                  <FormField
                    control={form.control}
                    name="warehouseStockId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-base font-semibold">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                          Langkah 1: Pilih Batch
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background dark:bg-background/50 h-11 w-full">
                              <SelectValue placeholder="Pilih No. Batch..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Daftar Batch</SelectLabel>
                              {batches.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                  <div className="flex w-full items-center justify-between gap-4">
                                    <span className="max-w-37.5 truncate font-mono font-medium">
                                      {batch.batchNumber || 'Tanpa Batch'}
                                    </span>
                                    <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                                      {batch.expiryDate && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(batch.expiryDate), 'dd/MM/yy')}
                                        </span>
                                      )}
                                      <Badge variant="secondary" className="text-[10px]">
                                        Qty: {batch.quantity}
                                      </Badge>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedBatch ? (
                  <div className="animate-in fade-in slide-in-from-top-4 space-y-6 duration-300">
                    {/* 2. Kalkulasi */}
                    <Card className="bg-accent/5 overflow-hidden border shadow-sm">
                      <CardContent className="space-y-6 p-5">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                          <h3 className="text-sm font-semibold tracking-wide uppercase">
                            Input Perhitungan
                          </h3>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Input Field */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Stok Sistem:</span>
                              <span className="font-mono font-bold">
                                {systemQty} {unit}
                              </span>
                            </div>

                            <FormField
                              control={form.control}
                              name="physicalQty"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-bold text-blue-600 dark:text-blue-400">
                                    Stok Fisik (Riil)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      value={field.value as number}
                                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                      className="bg-background h-12 border-blue-200 text-xl font-bold focus-visible:ring-blue-500 dark:border-blue-800"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Result Box */}
                          <div
                            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                              delta === 0
                                ? 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'
                                : delta < 0
                                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                                  : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                            }`}
                          >
                            <span className="text-muted-foreground text-[10px] font-bold uppercase">
                              Selisih (Delta)
                            </span>
                            <div
                              className={`my-1 text-4xl font-black ${
                                delta === 0
                                  ? 'text-slate-500'
                                  : delta < 0
                                    ? 'text-red-600'
                                    : 'text-green-600'
                              }`}
                            >
                              {delta > 0 && '+'}
                              {delta}
                            </div>
                            <div className="text-center text-xs font-medium">
                              {delta === 0 ? (
                                <span className="flex items-center text-slate-600 dark:text-slate-400">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Sesuai
                                </span>
                              ) : delta < 0 ? (
                                <span className="flex items-center text-red-600 dark:text-red-400">
                                  <AlertCircle className="mr-1 h-3 w-3" /> Kurang / Hilang
                                </span>
                              ) : (
                                <span className="flex items-center text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Lebih / Ditemukan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 3. Keterangan */}
                    <div className="bg-muted/30 dark:bg-muted/10 space-y-4 rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                        <h3 className="text-sm font-semibold tracking-wide uppercase">
                          Keterangan
                        </h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jenis Penyesuaian</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background w-full">
                                    <SelectValue placeholder="Pilih jenis..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ADJUSTMENT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {/* PERBAIKAN: Menghapus class warna spesifik */}
                                      <span className="font-medium">{type.label}</span>
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
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catatan</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Contoh: Rutin, Rusak, dll."
                                  className="bg-background h-10 min-h-10 resize-none transition-all focus:min-h-20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                    <PackageOpen className="text-muted-foreground mb-3 h-10 w-10 opacity-50" />
                    <p className="text-muted-foreground text-sm font-medium">
                      Pilih batch di atas untuk memulai.
                    </p>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="bg-muted/30 dark:bg-muted/10 shrink-0 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="opname-form"
            disabled={isLoading || !selectedBatch}
            className="min-w-35 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

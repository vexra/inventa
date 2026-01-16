'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import { StockOpnameFormValues, stockOpnameSchema } from '@/lib/validations/stock-opname'

import { submitStockOpname } from '../actions'

interface AdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    id: string
    consumableId: string
    consumableName: string
    currentQty: number
    unit: string
    batchNumber: string | null
  }
}

export function AdjustmentDialog({ open, onOpenChange, data }: AdjustmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(stockOpnameSchema),
    defaultValues: {
      warehouseStockId: data.id,
      consumableId: data.consumableId,
      physicalQty: data.currentQty,
      reason: '',
    },
  })

  const rawQty = form.watch('physicalQty')

  const parsedQty = Number(rawQty)

  const safePhysicalQty = isNaN(parsedQty) ? 0 : parsedQty

  const delta = safePhysicalQty - data.currentQty

  async function onSubmit(values: StockOpnameFormValues) {
    setIsLoading(true)
    try {
      const res = await submitStockOpname(values)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
        onOpenChange(false)
        form.reset()
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok (Opname)</DialogTitle>
          <DialogDescription>
            Input jumlah fisik aktual yang ada di gudang. Sistem akan mencatat selisihnya.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-md border p-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground block text-xs">Nama Barang</span>
              <span className="font-medium">{data.consumableName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">No. Batch</span>
              <span className="font-mono">{data.batchNumber || '-'}</span>
            </div>
            <div className="mt-2">
              <span className="text-muted-foreground block text-xs">Stok Sistem</span>
              <span className="font-mono text-lg font-bold">
                {data.currentQty} <span className="text-xs font-normal">{data.unit}</span>
              </span>
            </div>
            <div className="mt-2">
              <span className="text-muted-foreground block text-xs">Selisih (Preview)</span>
              <span
                className={`font-mono text-lg font-bold ${
                  delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="physicalQty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Fisik (Aktual)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      className="font-mono text-lg"
                      {...field}
                      value={field.value as number}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value)
                        field.onChange(val)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan Penyesuaian</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contoh: Barang rusak karena air, Salah hitung sebelumnya, dll."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {delta !== 0 && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-xs">
                  Anda akan mengubah stok dari <b>{data.currentQty}</b> menjadi{' '}
                  <b>{safePhysicalQty}</b>. Tindakan ini akan tercatat di sistem.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading || delta === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

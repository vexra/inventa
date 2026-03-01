'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { assetMaintenanceSchema, type AssetMaintenanceFormValues } from '@/lib/validations/maintenance'
import { createMaintenanceReport } from '@/lib/actions/maintenance'

interface ReportDamageFormProps {
  assetId: string
  inventoryNumber: string
  onCancel: () => void
  onSuccess: () => void
}

export function ReportDamageForm({ assetId, inventoryNumber, onCancel, onSuccess }: ReportDamageFormProps) {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<AssetMaintenanceFormValues>({
    resolver: zodResolver(assetMaintenanceSchema),
    defaultValues: {
      assetId,
      severity: undefined,
      description: '',
      repairCost: undefined,
      downtimeStart: new Date(),
    },
  })

  async function onSubmit(data: AssetMaintenanceFormValues) {
    setIsPending(true)
    const result = await createMaintenanceReport(data)
    setIsPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.success)
      onSuccess()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-semibold">Laporan Kerusakan Aset</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Aset: <span className="font-medium text-foreground">{inventoryNumber}</span>
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="severity" render={({ field }) => (
            <FormItem>
              <FormLabel>Tingkat Kerusakan</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={field.onChange}
                  defaultValue={field.value}
                >
                  <option value="">Pilih Tingkat Kerusakan</option>
                  <option value="MINOR">Rusak Ringan</option>
                  <option value="MODERATE">Rusak Sedang</option>
                  <option value="MAJOR">Rusak Berat / Mati Total</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Keterangan Kerusakan</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Jelaskan secara detail kerusakan yang terjadi..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="repairCost" render={({ field }) => (
            <FormItem>
              <FormLabel>Perkiraan Biaya Perbaikan (Rp)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

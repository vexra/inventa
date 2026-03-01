'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { assetModelSchema, type AssetModelFormValues } from '@/lib/validations/asset'
import { createAssetModel } from '@/lib/actions/asset-model'

export function AddModelDialog({ categories, brands }: { categories: any[], brands: any[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [specInputs, setSpecInputs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])

  const form = useForm<AssetModelFormValues>({
    resolver: zodResolver(assetModelSchema),
    defaultValues: { name: '', modelNumber: '', description: '', isMovable: false },
  })

  function addSpecField() {
    setSpecInputs([...specInputs, { key: '', value: '' }])
  }

  function removeSpecField(index: number) {
    setSpecInputs(specInputs.filter((_, i) => i !== index))
  }

  function updateSpecField(index: number, field: 'key' | 'value', value: string) {
    const updated = [...specInputs]
    updated[index][field] = value
    setSpecInputs(updated)
  }

  async function onSubmit(data: AssetModelFormValues) {
    // Convert spec inputs to object
    const specs: Record<string, string> = {}
    specInputs.forEach(({ key, value }) => {
      if (key.trim()) specs[key.trim()] = value.trim()
    })

    const finalData = {
      ...data,
      specifications: Object.keys(specs).length > 0 ? specs : undefined,
    }

    setIsPending(true)
    const result = await createAssetModel(finalData)
    setIsPending(false)

    if (result.error) toast.error(result.error)
    else {
      toast.success(result.success)
      setOpen(false)
      form.reset()
      setSpecInputs([{ key: '', value: '' }])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Tambah Model Aset</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrasi Model Aset Baru</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="categoryId" render={({ field }) => (
              <FormItem>
                <FormLabel>Kategori</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="brandId" render={({ field }) => (
              <FormItem>
                <FormLabel>Merek</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Merek" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Seri / Tipe</FormLabel>
                <FormControl><Input placeholder="Cth: Zenbook 14 OLED" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="modelNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor Model Pabrik (Opsional)</FormLabel>
                <FormControl><Input placeholder="Cth: UX3402ZA" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Jenis Aset - Bergerak / Tidak Bergerak */}
            <FormField control={form.control} name="isMovable" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Aset Bergerak</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Aktifkan jika aset dapat dipindahkan/dibawa
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )} />

            {/* Spesifikasi - Dynamic Fields */}
            <div className="space-y-3">
              <FormLabel>Spesifikasi (Opsional)</FormLabel>
              {specInputs.map((spec, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Cth: RAM, Processor, Kapasitas"
                    value={spec.key}
                    onChange={(e) => updateSpecField(index, 'key', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Cth: 16GB, i7, 512GB"
                    value={spec.value}
                    onChange={(e) => updateSpecField(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  {specInputs.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSpecField(index)}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSpecField}>
                + Tambah Spesifikasi
              </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Menyimpan...' : 'Simpan Model'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch'

import { fixedAssetSchema, type FixedAssetFormValues } from '@/lib/validations/asset'
import { createFixedAsset } from '@/lib/actions/asset'

// Nanti props ini akan diisi data dari database saat dipanggil di halaman utama
interface AddAssetDialogProps {
  models: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
  warehouses: { id: string; name: string }[]
}

export function AddAssetDialog({ models, rooms, warehouses }: AddAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<FixedAssetFormValues>({
    resolver: zodResolver(fixedAssetSchema) as Resolver<FixedAssetFormValues>,
    defaultValues: {
      inventoryNumber: '',
      isMovable: true,
      condition: 'GOOD',
      // Nilai default lainnya kosong
    },
  })

  async function onSubmit(data: FixedAssetFormValues) {
    setIsPending(true)
    try {
      const result = await createFixedAsset(data)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        setOpen(false) // Tutup modal jika sukses
        form.reset() // Kosongkan form
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Registrasi Aset Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail aset fisik. QR Code akan di-generate secara otomatis oleh sistem.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              {/* NOMOR INVENTARIS */}
              <FormField
                control={form.control}
                name="inventoryNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Inventaris (Rektorat)</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: INV-2026-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* MODEL ASET */}
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model / Spesifikasi Aset</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih model aset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ALOKASI RUANGAN */}
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alokasi Ruangan (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

              {/* KONDISI */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kondisi Barang</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kondisi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GOOD">Baik</SelectItem>
                        <SelectItem value="MINOR_DAMAGE">Rusak Ringan</SelectItem>
                        <SelectItem value="MAJOR_DAMAGE">Rusak Berat</SelectItem>
                        <SelectItem value="BROKEN">Mati Total</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* IS MOvable (Boleh dipindah atau tidak) */}
            <FormField
              control={form.control}
              name="isMovable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Barang Portabel (Movable)</FormLabel>
                    <DialogDescription>
                      Aktifkan jika barang ini boleh dipindah ruangan (seperti Laptop). Matikan jika barang ini dikunci di ruangan (seperti Timbangan Analitik / AC).
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Aset'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
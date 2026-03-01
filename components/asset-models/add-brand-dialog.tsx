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
import { brandSchema, type BrandFormValues } from '@/lib/validations/brand'
import { createBrand } from '@/lib/actions/brand'

export function AddBrandDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '', country: '' },
  })

  async function onSubmit(data: BrandFormValues) {
    setIsPending(true)
    const result = await createBrand(data)
    setIsPending(false)

    if (result.error) toast.error(result.error)
    else {
      toast.success(result.success)
      setOpen(false)
      form.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Tambah Merek</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Merek Baru</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Merek</FormLabel>
                  <FormControl><Input placeholder="Cth: Asus, Epson, dll" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Menyimpan...' : 'Simpan Merek'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
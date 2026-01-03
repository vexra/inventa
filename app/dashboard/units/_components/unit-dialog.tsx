'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { UnitFormValues, unitSchema } from '@/lib/validations/unit'

import { createUnit, updateUnit } from '../actions'

interface UnitDialogProps {
  mode?: 'create' | 'edit'
  initialData?: { id: string; name: string; description: string | null }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UnitDialog({ mode = 'create', initialData, open, onOpenChange }: UnitDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
  })

  const isLoading = form.formState.isSubmitting

  async function onSubmit(data: UnitFormValues) {
    try {
      let result
      if (mode === 'create') {
        result = await createUnit(data)
      } else if (initialData?.id) {
        result = await updateUnit(initialData.id, data)
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message)
        setIsOpen?.(false)
        if (mode === 'create') form.reset()
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && mode === 'create' && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah Unit
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Unit Baru' : 'Edit Unit'}</DialogTitle>
          <DialogDescription>Kelola data unit kerja atau departemen.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Unit</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Laboratorium Kimia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Keterangan singkat unit..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Simpan' : 'Perbarui'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

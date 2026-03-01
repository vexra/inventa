'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { receiveDistributionHandshake } from '@/lib/actions/distribution'
import { CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReceiveFormProps {
  targetId: string
  modelName: string
  roomId: string
  pendingQty: number
  userId: string
}

export function ReceiveForm({
  targetId,
  modelName,
  roomId,
  pendingQty,
  userId,
}: ReceiveFormProps) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(pendingQty.toString())
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0 || qty > pendingQty) {
      toast.error('Jumlah tidak valid')
      setIsLoading(false)
      return
    }

    const result = await receiveDistributionHandshake({
      targetId,
      receivedQty: qty,
      roomId,
      receiverId: userId,
    })

    setIsLoading(false)

    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      // Refresh the page to show updated data
      window.location.reload()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <CheckCircle className="mr-2 h-4 w-4" />
          Terima
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Penerimaan Barang</DialogTitle>
          <DialogDescription>
            Anda akan menerima aset untuk ruangan ini. Silakan masukkan jumlah yang diterima.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Model Aset</Label>
              <Input value={modelName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Jumlah Dikirim</Label>
              <Input value={pendingQty} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah Diterima</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={pendingQty}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maksimal: {pendingQty} unit
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Konfirmasi Penerimaan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

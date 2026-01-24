'use client'

import QRCode from 'react-qr-code'

import { Copy, QrCode } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'

interface PickupQRProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestCode: string
}

export function PickupQR({ open, onOpenChange, requestId, requestCode }: PickupQRProps) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(requestId)
    toast.success('ID Request disalin ke clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Kode Pengambilan
          </DialogTitle>
          <DialogDescription>
            Tunjukkan QR Code ini kepada petugas gudang untuk mengambil barang.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-6 py-6">
          <div className="border-muted rounded-xl border-2 bg-white p-4 shadow-sm">
            <div className="h-48 w-48">
              <QRCode
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                value={requestId}
                viewBox={`0 0 256 256`}
              />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-2 text-center">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">
              Kode Request
            </span>
            <div className="bg-secondary/50 flex items-center gap-2 rounded-md px-4 py-2 font-mono text-xl font-bold tracking-widest">
              {requestCode}
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full sm:w-auto"
            onClick={handleCopyId}
          >
            <Copy className="mr-2 h-3 w-3" />
            Salin ID
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

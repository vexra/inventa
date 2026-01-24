'use client'

import { useState } from 'react'

import { Scanner } from '@yudiel/react-qr-scanner'
import { CheckCircle2, Loader2, ScanLine, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { completeRequestByQR } from '../actions'

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: () => void
}

export function QRScannerDialog({ open, onOpenChange, onScanSuccess }: QRScannerDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const handleScan = async (detectedCodes: { rawValue: string }[]) => {
    const code = detectedCodes[0]?.rawValue

    if (!code || isProcessing || code === lastScanned) return

    setIsProcessing(true)
    setLastScanned(code)

    const toastId = toast.loading('Memproses QR Code...')

    try {
      const res = await completeRequestByQR(code)

      if (res.error) {
        toast.error(res.error, {
          id: toastId,
          icon: <XCircle className="h-4 w-4 text-red-500" />,
        })
        setLastScanned(null)
      } else {
        toast.success(res.message, {
          id: toastId,
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        })

        onOpenChange(false)
        if (onScanSuccess) onScanSuccess()
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses data', { id: toastId })
      setLastScanned(null)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan QR Pengambilan
          </DialogTitle>
          <DialogDescription>
            Arahkan kamera ke QR Code yang ditunjukkan oleh pemohon untuk menyelesaikan transaksi.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl border bg-black shadow-inner">
          {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="mt-2 text-sm font-medium">Memverifikasi...</p>
            </div>
          )}

          <div className="aspect-square w-full">
            {open && (
              <Scanner
                onScan={handleScan}
                allowMultiple={true}
                scanDelay={2000}
                components={{
                  onOff: false,
                  torch: false,
                  finder: true,
                }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { objectFit: 'cover' },
                }}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

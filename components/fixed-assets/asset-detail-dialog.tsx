'use client'

import { useState } from 'react'
import { Eye, QrCode, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ReportDamageForm } from './report-damage-form'

interface AssetDetailDialogProps {
  asset: {
    id: string
    inventoryNumber: string
    qrToken: string | null
    serialNumber: string | null
    condition: string | null
    isMovable: boolean
    modelName: string | null
    brandName: string | null
    roomName: string | null
    warehouseName: string | null
  }
}

// Helper untuk menampilkan kondisi
const getConditionLabel = (condition: string | null) => {
  switch (condition) {
    case 'GOOD': return 'Baik'
    case 'MINOR_DAMAGE': return 'Rusak Ringan'
    case 'MAJOR_DAMAGE': return 'Rusak Berat'
    case 'BROKEN': return 'Mati Total'
    case 'MAINTENANCE': return 'Perawatan'
    case 'LOST': return 'Hilang'
    default: return condition || '-'
  }
}

const getConditionBadge = (condition: string | null) => {
  switch (condition) {
    case 'GOOD': return <Badge className="bg-green-500">Baik</Badge>
    case 'MINOR_DAMAGE': return <Badge variant="secondary" className="bg-yellow-500 text-white">Rusak Ringan</Badge>
    case 'MAJOR_DAMAGE': return <Badge variant="destructive">Rusak Berat</Badge>
    case 'BROKEN': return <Badge variant="destructive" className="bg-red-800">Mati Total</Badge>
    case 'MAINTENANCE': return <Badge variant="outline">Perawatan</Badge>
    case 'LOST': return <Badge variant="destructive">Hilang</Badge>
    default: return <Badge variant="outline">{condition || '-'}</Badge>
  }
}

export function AssetDetailDialog({ asset }: AssetDetailDialogProps) {
  const [open, setOpen] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Aset</DialogTitle>
        </DialogHeader>

        {!showReportForm ? (
          <div className="space-y-4">
            {/* Info Aset */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">No. Inventaris</p>
                <p className="font-semibold">{asset.inventoryNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">No. Seri</p>
                <p className="font-semibold">{asset.serialNumber || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Model</p>
                <p className="font-semibold">{asset.modelName || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Merek</p>
                <p className="font-semibold">{asset.brandName || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lokasi</p>
                <p className="font-semibold">
                  {asset.roomName ? `Ruang: ${asset.roomName}` :
                   asset.warehouseName ? `Gudang: ${asset.warehouseName}` :
                   'Belum dialokasikan'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Jenis Aset</p>
                <Badge variant={asset.isMovable ? 'default' : 'secondary'}>
                  {asset.isMovable ? 'Bergerak' : 'Tetap'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Kondisi</p>
                {getConditionBadge(asset.condition)}
              </div>
            </div>

            {/* QR Code Token */}
            {asset.qrToken && (
              <>
                <Separator />
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">QR Token</p>
                  <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                    {asset.qrToken}
                  </Badge>
                </div>
              </>
            )}

            <Separator />

            {/* Aksi Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Print QR functionality
                  if (asset.qrToken) {
                    window.print()
                  }
                }}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Print QR
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowReportForm(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Lapor Kerusakan
              </Button>
            </div>
          </div>
        ) : (
          <ReportDamageForm
            assetId={asset.id}
            inventoryNumber={asset.inventoryNumber}
            onCancel={() => setShowReportForm(false)}
            onSuccess={() => {
              setShowReportForm(false)
              setOpen(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Package, Eye, Printer, AlertTriangle, Loader2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { reportAssetDamage } from '@/lib/actions/maintenance'

interface AssetItem {
  id: string
  qrToken: string
  inventoryNumber: string | null
  serialNumber: string | null
  isMovable: boolean
  movementStatus: string
  condition: string

  model: {
    id: string
    name: string
    modelNumber: string | null
    specifications: Record<string, unknown> | null
  }
  category: string | null
  room: {
    id: string
    name: string
    type: string
  }
  building: string
}

interface AssetTableProps {
  data: AssetItem[]
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  currentSort: {
    column: string
    direction: 'asc' | 'desc'
  }
  children?: React.ReactNode
}

function getConditionBadge(condition: string) {
  switch (condition) {
    case 'GOOD':
      return <Badge className="bg-green-500">Baik</Badge>
    case 'MINOR_DAMAGE':
      return <Badge className="bg-yellow-500 text-white">Rusak Ringan</Badge>
    case 'MAJOR_DAMAGE':
      return <Badge variant="destructive">Rusak Berat</Badge>
    case 'BROKEN':
      return <Badge variant="destructive" className="bg-red-800">Mati Total</Badge>
    case 'MAINTENANCE':
      return <Badge variant="outline">Perawatan</Badge>
    case 'LOST':
      return <Badge variant="destructive">Hilang</Badge>
    default:
      return <Badge>{condition}</Badge>
  }
}

// Komponen Dialog Cetak QR
function PrintQRDialog({ asset }: { asset: AssetItem }) {
  const handlePrint = () => {
    const printContent = document.getElementById('qr-print-area')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${asset.model.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
            }
            .qr-container {
              display: inline-block;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .asset-name {
              font-size: 18px;
              font-weight: bold;
              margin-top: 16px;
            }
            .asset-info {
              font-size: 12px;
              color: #666;
              margin-top: 8px;
            }
            .qr-token {
              font-family: monospace;
              font-size: 14px;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${printContent.innerHTML}
            <div class="asset-name">${asset.model.name}</div>
            <div class="asset-info">${asset.room.name} - ${asset.building}</div>
            <div class="qr-token">${asset.qrToken}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-1" />
          Cetak QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cetak QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="border-2 border-black p-4 bg-white rounded-lg" id="qr-print-area">
            <QRCode
              value={asset.qrToken}
              size={180}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>
          <div className="text-center">
            <p className="font-semibold">{asset.model.name}</p>
            <p className="text-sm text-muted-foreground">{asset.room.name} - {asset.building}</p>
            <p className="font-mono text-sm mt-2">{asset.qrToken}</p>
          </div>
          <Button onClick={handlePrint} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Cetak QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Komponen Dialog Laporan Kerusakan
function ReportDamageDialog({ asset }: { asset: AssetItem }) {
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<'MINOR' | 'MODERATE' | 'MAJOR'>('MINOR')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Deskripsi kerusakan wajib diisi')
      return
    }

    setIsLoading(true)
    const result = await reportAssetDamage(asset.id, severity, description)
    setIsLoading(false)

    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      setDescription('')
      setSeverity('MINOR')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Lapor Kerusakan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lapor Kerusakan Aset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-semibold">{asset.model.name}</p>
              <p className="text-sm text-muted-foreground">
                {asset.inventoryNumber || asset.qrToken}
              </p>
              <p className="text-sm text-muted-foreground">
                Lokasi: {asset.room.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Tingkat Kerusakan</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINOR">Rusak Ringan</SelectItem>
                  <SelectItem value="MODERATE">Rusak Sedang</SelectItem>
                  <SelectItem value="MAJOR">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Kerusakan</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan kerusakan yang terjadi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Laporan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Komponen Detail Dialog
function AssetDetailCell({ asset }: { asset: AssetItem }) {
  return (
    <div className="flex items-center gap-2">
      <Dialog>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">No. Inventaris</p>
                <p className="font-semibold">{asset.inventoryNumber || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">No. Seri</p>
                <p className="font-semibold">{asset.serialNumber || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Model</p>
                <p className="font-semibold">{asset.model.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kategori</p>
                <p className="font-semibold">{asset.category || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ruangan</p>
                <p className="font-semibold">{asset.room.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gedung</p>
                <p className="font-semibold">{asset.building}</p>
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
            <Separator />
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">QR Token</p>
              <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                {asset.qrToken}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintQRDialog asset={asset} />
      <ReportDamageDialog asset={asset} />
    </div>
  )
}

export function AssetTable({ data, metadata, currentSort, children }: AssetTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar searchPlaceholder="Cari aset...">
        {children}
      </DataTableToolbar>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Inventaris</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-50" />
                    <p>Tidak ada data aset.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">
                    {asset.inventoryNumber || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{asset.model.name}</span>
                      {asset.model.modelNumber && (
                        <span className="text-xs text-muted-foreground">
                          {asset.model.modelNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{asset.room.name}</span>
                      <span className="text-xs text-muted-foreground">{asset.building}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={asset.isMovable ? 'default' : 'secondary'}>
                      {asset.isMovable ? 'Bergerak' : 'Tetap'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AssetDetailCell asset={asset} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        metadata={metadata}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db' // Sesuaikan path db
import { eq } from 'drizzle-orm'
import { assetDistributions } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, CheckCircle2, Clock, Package } from 'lucide-react'
import { requireAuth } from '@/lib/auth-guard'

export const metadata = {
  title: 'Detail Distribusi Aset',
}

export default async function DistributionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Proteksi halaman
  await requireAuth({ 
    roles: ['super_admin', 'warehouse_staff', 'faculty_admin', 'unit_admin'] 
  })

  // Ambil data distribusi beserta relasi target ruangannya
  const { id: distributionId } = await params;

  const distribution = await db.query.assetDistributions.findFirst({
    where: eq(assetDistributions.id, distributionId),
    with: {
      model: true,
      actor: true,
      targets: {
        with: {
          targetRoom: {
            with: { building: true } 
          },
          receiver: true, 
        },
      },
    },
  })

  if (!distribution) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Data Tidak Ditemukan</h2>
        <p>Sistem mencari distribusi dengan ID: <strong>{distributionId}</strong></p>
        <p>Tetapi data tersebut tidak ada di database tabel <code>asset_distributions</code>.</p>
      </div>
    )
  }
  // Fungsi warna status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="outline">Draft (Belum Dikirim)</Badge>
      case 'SHIPPED': return <Badge className="bg-amber-100 text-amber-800">Sedang Dikirim</Badge>
      case 'COMPLETED': return <Badge className="bg-green-100 text-green-800">Selesai</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/distributions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detail Distribusi</h2>
          <p className="text-muted-foreground">Rincian alokasi dan status penerimaan tiap ruangan.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* KARTU INFO UTAMA */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pengiriman</CardTitle>
            <CardDescription>Data utama dari dropping ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Kode Distribusi</span>
                <span className="font-semibold text-lg">{distribution.distributionCode}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status</span>
                <div className="mt-1">{getStatusBadge(distribution.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground block">Model Aset</span>
                <span className="font-medium flex items-center gap-1 mt-1">
                  <Package className="w-4 h-4" /> {distribution.model.name}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Unit</span>
                <span className="font-bold text-lg">{distribution.totalQuantity} Unit</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Dibuat Oleh</span>
                <span className="font-medium">{distribution.actor?.name || 'Sistem'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Tanggal Dibuat</span>
                <span className="font-medium">
                  {distribution.createdAt?.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block">Catatan Tambahan</span>
                <span className="font-medium">{distribution.notes || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BISA DITAMBAHKAN CHART/SUMMARY DI SINI NANTINYA */}
      </div>

      {/* TABEL MATRIKS ALOKASI & STATUS PENERIMAAN */}
      <Card>
        <CardHeader>
          <CardTitle>Status Penerimaan per Ruangan</CardTitle>
          <CardDescription>
            Pantau ruangan mana yang sudah melakukan konfirmasi terima barang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Ruangan</TableHead>
                <TableHead>Gedung</TableHead>
                <TableHead className="text-center">Jatah Alokasi</TableHead>
                <TableHead className="text-center">Sudah Diterima</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.targets.map((target) => {
                const pendingQty = target.allocatedQuantity - target.receivedQuantity
                const isDone = pendingQty === 0

                return (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.targetRoom?.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {target.targetRoom?.building?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{target.allocatedQuantity}</TableCell>
                    <TableCell className="text-center font-bold text-green-600">
                      {target.receivedQuantity}
                    </TableCell>
                    <TableCell>
                      {target.receiver ? (
                        <div>
                          <p className="font-medium text-sm">{target.receiver.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {target.receivedAt?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {distribution.status === 'DRAFT' ? (
                        <span className="text-sm text-muted-foreground">Menunggu Pengiriman</span>
                      ) : isDone ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Diterima
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="w-3 h-3 mr-1" /> Menunggu ({pendingQty})
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

import { db } from '@/lib/db'
import { assetDistributionTargets, rooms } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-guard'
import { Inbox, Package, Building } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReceiveForm } from './_components/receive-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Barang Masuk - Handshake Penerimaan',
}

export default async function IncomingDistributionsPage() {
  // Proteksi halaman - hanya unit_staff dan unit_admin yang bisa akses
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin']
  })

  const userUnitId = session.user.unitId as string | undefined

  // Jika user tidak memiliki unit, tampilkan pesan
  if (!userUnitId) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Barang Masuk</h2>
            <p className="text-muted-foreground">
              Konfirmasi penerimaan aset yang dikirim ke unit Anda.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Anda belum ditambahkan ke unit kerja manapun. Silakan hubungi administrator untuk menambahkan Anda ke unit kerja.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ambil rooms yang milik unit user
  const userRooms = await db.query.rooms.findMany({
    where: eq(rooms.unitId, userUnitId),
    columns: { id: true },
  })

  const roomIds = userRooms.map(r => r.id)

  if (roomIds.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Barang Masuk</h2>
            <p className="text-muted-foreground">
              Konfirmasi penerimaan aset yang dikirim ke unit Anda.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              Unit Anda belum memiliki ruangan yang terdaftar. Silakan hubungi administrator untuk menambahkan ruangan ke unit Anda.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ambil distribusi dengan status SHIPPED yang target-nya adalah ruangan user
  const incomingTargets = await db.query.assetDistributionTargets.findMany({
    where: and(
      inArray(assetDistributionTargets.targetRoomId, roomIds),
      // Tampilkan jika masih ada barang yang belum diterima
      // eq(assetDistributions.status, 'SHIPPED') // Dihapus karena JOIN tidak bisa langsung begini
    ),
    with: {
      distribution: {
        with: {
          model: true,
          actor: { columns: { name: true } },
        },
      },
      targetRoom: {
        with: {
          building: { columns: { name: true } },
        },
      },
      receiver: { columns: { name: true } },
    },
  })

  // Filter yang status-nya SHIPPED dan belum lengkap diterima
  const pendingIncoming = incomingTargets.filter(
    target => target.distribution.status === 'SHIPPED' && target.receivedQuantity < target.allocatedQuantity
  )

  // Fungsi untuk cek status badge
  const getReceiveStatus = (target: typeof pendingIncoming[0]) => {
    if (target.receivedQuantity === 0) {
      return <Badge variant="outline" className="text-slate-600 border-slate-300">Belum Diterima</Badge>
    } else if (target.receivedQuantity < target.allocatedQuantity) {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Diterima Sebagian</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Lengkap</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Barang Masuk</h2>
          <p className="text-muted-foreground">
            Konfirmasi penerimaan aset yang dikirim ke unit Anda.
          </p>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Distribusi</TableHead>
              <TableHead>Tanggal Dikirim</TableHead>
              <TableHead>Model Aset</TableHead>
              <TableHead>Ruangan Tujuan</TableHead>
              <TableHead className="text-center">Jml Dikirim</TableHead>
              <TableHead className="text-center">Sudah Diterima</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingIncoming.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada barang masuk yang menunggu penerimaan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pendingIncoming.map((target) => {
                const pendingQty = target.allocatedQuantity - target.receivedQuantity
                return (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {target.distribution.distributionCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      {target.distribution.createdAt?.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{target.distribution.model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Dikirim oleh: {target.distribution.actor?.name || 'Sistem'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span>{target.targetRoom.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {target.targetRoom.building?.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {target.allocatedQuantity}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={target.receivedQuantity > 0 ? 'text-green-600 font-medium' : ''}>
                        {target.receivedQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getReceiveStatus(target)}
                    </TableCell>
                    <TableCell className="text-right">
                      {pendingQty > 0 && (
                        <ReceiveForm
                          targetId={target.id}
                          modelName={target.distribution.model.name}
                          roomId={target.targetRoomId}
                          pendingQty={pendingQty}
                          userId={session.user.id}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Riwayat Penerimaan yang sudah lengkap */}
      {pendingIncoming.some(t => t.receivedQuantity > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Riwayat Penerimaan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Aset</TableHead>
                  <TableHead>Ruangan</TableHead>
                  <TableHead className="text-center">Diterima</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingIncoming
                  .filter(t => t.receivedQuantity > 0)
                  .map((target) => (
                    <TableRow key={`history-${target.id}`}>
                      <TableCell className="font-medium">{target.distribution.distributionCode}</TableCell>
                      <TableCell>{target.distribution.model.name}</TableCell>
                      <TableCell>{target.targetRoom.name}</TableCell>
                      <TableCell className="text-center">{target.receivedQuantity}</TableCell>
                      <TableCell>{target.receiver?.name || '-'}</TableCell>
                      <TableCell>
                        {target.receivedAt?.toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

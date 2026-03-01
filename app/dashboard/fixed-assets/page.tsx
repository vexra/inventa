import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { fixedAssets, assetModels, rooms, warehouses, brands } from '@/db/schema'
import { AddAssetDialog } from '@/components/fixed-assets/add-asset-dialog'
import { AssetDetailDialog } from '@/components/fixed-assets/asset-detail-dialog'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function FixedAssetsPage() {
  // 1. Ambil data untuk Dropdown di form (Dilempar ke komponen AddAssetDialog)
  const modelsData = await db.select({ id: assetModels.id, name: assetModels.name }).from(assetModels)
  const roomsData = await db.select({ id: rooms.id, name: rooms.name }).from(rooms)
  const warehousesData = await db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses)

  // 2. Ambil data Tabel Aset (Di-Join agar mendapat nama Merek, Model, dan Ruangan)
  const assetsData = await db
    .select({
      id: fixedAssets.id,
      inventoryNumber: fixedAssets.inventoryNumber,
      qrToken: fixedAssets.qrToken,
      serialNumber: fixedAssets.serialNumber,
      condition: fixedAssets.condition,
      isMovable: fixedAssets.isMovable,
      modelId: fixedAssets.modelId,
      modelName: assetModels.name,
      brandName: brands.name,
      roomName: rooms.name,
      warehouseName: warehouses.name,
      createdAt: fixedAssets.createdAt,
    })
    .from(fixedAssets)
    .leftJoin(assetModels, eq(fixedAssets.modelId, assetModels.id))
    .leftJoin(brands, eq(assetModels.brandId, brands.id)) // Ambil nama Merek
    .leftJoin(rooms, eq(fixedAssets.roomId, rooms.id)) // Ambil nama Ruangan
    .leftJoin(warehouses, eq(fixedAssets.warehouseId, warehouses.id)) // Ambil nama Gudang
    .orderBy(desc(fixedAssets.createdAt))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aset</h1>
          <p className="text-muted-foreground">
            Kelola data inventaris aset dan kode QR.
          </p>
        </div>
        {/* Panggil komponen Form yang tadi kita buat, dan lempar data dropdown-nya */}
        <AddAssetDialog
          models={modelsData}
          rooms={roomsData}
          warehouses={warehousesData}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aset</CardTitle>
          <CardDescription>Semua aset fisik yang terdaftar di sistem.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {assetsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada data aset yang terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                assetsData.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.inventoryNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{asset.modelName}</span>
                        <span className="text-xs text-muted-foreground">{asset.brandName || 'Tanpa Merek'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Tampilkan Ruangan jika ada, kalau tidak ada tampilkan Gudang */}
                      {asset.roomName ? `Ruang: ${asset.roomName}` :
                       asset.warehouseName ? `Gudang: ${asset.warehouseName}` :
                       'Belum dialokasikan'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.isMovable ? 'default' : 'secondary'}>
                        {asset.isMovable ? 'Bergerak' : 'Tetap'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AssetDetailDialog asset={asset} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

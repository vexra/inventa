import { and, count, desc, eq, sql } from 'drizzle-orm'
import { AlertTriangle, ArrowDownToLine, Box, ClipboardList, PackageCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { auditLogs, consumables, procurements, requests, user, warehouseStocks } from '@/db/schema'
import { db } from '@/lib/db'

import { RecentActivityList } from './recent-activity-list'

export async function WarehouseStaffDashboard({
  user: currentUser,
}: {
  user: { name?: string | null; warehouseId?: string | null; warehouseName?: string | null }
}) {
  if (!currentUser.warehouseId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <h2 className="text-xl font-bold">Gudang Belum Ditentukan</h2>
        <p className="text-muted-foreground">
          Akun Anda belum dipetakan ke gudang fisik manapun. Hubungi Admin.
        </p>
      </div>
    )
  }

  const myWarehouseId = currentUser.warehouseId

  const [totalItems, lowStockItems, pendingReceives, pendingRequests, recentWarehouseActivity] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(warehouseStocks)
        .where(eq(warehouseStocks.warehouseId, myWarehouseId)),

      db
        .select({ value: count() })
        .from(warehouseStocks)
        .leftJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
        .where(
          and(
            eq(warehouseStocks.warehouseId, myWarehouseId),
            sql`${warehouseStocks.quantity} < ${consumables.minimumStock}`,
          ),
        ),

      db.select({ value: count() }).from(procurements).where(eq(procurements.status, 'APPROVED')),

      db
        .select({ value: count() })
        .from(requests)
        .where(and(eq(requests.status, 'APPROVED'), eq(requests.targetWarehouseId, myWarehouseId))),

      db
        .select({
          action: auditLogs.action,
          tableName: auditLogs.tableName,
          createdAt: auditLogs.createdAt,
          userName: user.name,
        })
        .from(auditLogs)
        .leftJoin(user, eq(auditLogs.userId, user.id))
        .where(eq(user.warehouseId, myWarehouseId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(5),
    ])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>

        <p className="text-muted-foreground">
          Halo, <span className="text-foreground font-medium">{currentUser.name}</span>. Berikut
          ringkasan operasional <span className="text-foreground font-semibold">Gudang Anda</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item (SKU)</CardTitle>
            <Box className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems[0].value}</div>
            <p className="text-muted-foreground text-xs">Jenis barang tersimpan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems[0].value}</div>
            <p className="text-muted-foreground text-xs">Di bawah batas minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terima Barang</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReceives[0].value}</div>
            <p className="text-muted-foreground text-xs">Menunggu verifikasi fisik</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permintaan Unit</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests[0].value}</div>
            <p className="text-muted-foreground text-xs">Disetujui Fakultas, siap proses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Status Operasional</CardTitle>
            <CardDescription>Ringkasan tugas yang perlu diselesaikan hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <PackageCheck className="h-4 w-4" />
                  Barang Masuk
                </h4>
                {pendingReceives[0].value > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Terdapat{' '}
                    <span className="text-foreground font-bold">
                      {pendingReceives[0].value} dokumen pengadaan
                    </span>{' '}
                    yang statusnya "Disetujui". Silakan buka menu <b>Pengadaan</b> untuk melakukan
                    penerimaan barang dan pencatatan stok.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Tidak ada barang masuk yang menunggu penerimaan saat ini.
                  </p>
                )}
              </div>

              <div className="bg-muted rounded-md p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <ClipboardList className="h-4 w-4" />
                  Permintaan Barang
                </h4>
                {pendingRequests[0].value > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Terdapat{' '}
                    <span className="text-foreground font-bold">
                      {pendingRequests[0].value} permintaan
                    </span>{' '}
                    dari Unit/Jurusan yang sudah disetujui Fakultas. Silakan buka menu{' '}
                    <b>Permintaan</b> untuk menyiapkan barang.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Tidak ada permintaan barang baru yang perlu diproses.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <RecentActivityList logs={recentWarehouseActivity} />
      </div>
    </div>
  )
}

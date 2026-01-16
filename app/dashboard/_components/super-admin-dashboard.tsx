import { count, desc, eq, gte } from 'drizzle-orm'
import {
  Box,
  Building2,
  Database,
  FlaskConical,
  Layers,
  MapPin,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react'

import { TransactionVolumeChart } from '@/components/transaction-volume-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  assetModels,
  auditLogs,
  categories,
  consumables,
  procurementAssets,
  procurementConsumables,
  procurements,
  requests,
  rooms,
  units,
  user,
  warehouses,
} from '@/db/schema'
import { db } from '@/lib/db'

import { RecentActivityList } from './recent-activity-list'

export async function SuperAdminDashboard({
  user: currentUser,
}: {
  user: { name?: string | null }
}) {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  oneYearAgo.setDate(1)

  const [
    totalConsumables,
    totalAssetModels,
    recentLogs,
    consumableRequests,
    consumableProcurements,
    assetProcurements,
    totalUnits,
    totalRooms,
    totalWarehouses,
    totalCategories,
    totalUsers,
  ] = await Promise.all([
    db.select({ value: count() }).from(consumables),
    db.select({ value: count() }).from(assetModels),
    db
      .select({
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        createdAt: auditLogs.createdAt,
        userName: user.name,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(5),
    db
      .select({ createdAt: requests.createdAt })
      .from(requests)
      .where(gte(requests.createdAt, oneYearAgo)),
    db
      .select({ createdAt: procurements.createdAt })
      .from(procurementConsumables)
      .innerJoin(procurements, eq(procurementConsumables.procurementId, procurements.id))
      .where(gte(procurements.createdAt, oneYearAgo)),
    db
      .select({ createdAt: procurements.createdAt })
      .from(procurementAssets)
      .innerJoin(procurements, eq(procurementAssets.procurementId, procurements.id))
      .where(gte(procurements.createdAt, oneYearAgo)),
    db.select({ value: count() }).from(units),
    db.select({ value: count() }).from(rooms),
    db.select({ value: count() }).from(warehouses),
    db.select({ value: count() }).from(categories),
    db.select({ value: count() }).from(user),
  ])

  const chartLabels: string[] = []
  const dataBhpRequests: number[] = []
  const dataBhpProcurements: number[] = []
  const dataAssetProcurements: number[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)

    const monthLabel = new Intl.DateTimeFormat('id-ID', {
      month: 'short',
      year: '2-digit',
    }).format(d)
    chartLabels.push(monthLabel)

    const tMonth = d.getMonth()
    const tYear = d.getFullYear()

    const filterByMonth = (items: { createdAt: Date | null }[]) =>
      items.filter((item) => {
        if (!item.createdAt) return false
        const itemDate = new Date(item.createdAt)
        return itemDate.getMonth() === tMonth && itemDate.getFullYear() === tYear
      }).length

    dataBhpRequests.push(filterByMonth(consumableRequests))
    dataBhpProcurements.push(filterByMonth(consumableProcurements))
    dataAssetProcurements.push(filterByMonth(assetProcurements))
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Halo, <span className="text-foreground font-medium">{currentUser.name}</span>. Berikut
          ringkasan sistem.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="consumables" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Barang Habis Pakai
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Aset Tetap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Unit</CardTitle>
                <Building2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUnits[0].value}</div>
                <p className="text-muted-foreground text-xs">Jurusan / Divisi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ruangan</CardTitle>
                <MapPin className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRooms[0].value}</div>
                <p className="text-muted-foreground text-xs">Lokasi Fisik</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gudang</CardTitle>
                <Warehouse className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalWarehouses[0].value}</div>
                <p className="text-muted-foreground text-xs">Penyimpanan Stok</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Kategori</CardTitle>
                <Tags className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCategories[0].value}</div>
                <p className="text-muted-foreground text-xs">Klasifikasi Barang</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">Pengguna Sistem</CardTitle>
                  <CardDescription>Total admin dan staff yang terdaftar.</CardDescription>
                </div>
                <Users className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{totalUsers[0].value}</div>
                <p className="text-muted-foreground mt-1 text-xs">Akun aktif</p>
              </CardContent>
            </Card>
            <RecentActivityList logs={recentLogs} />
          </div>
        </TabsContent>

        {/* Tab Consumables & Assets dipertahankan sama seperti kode asli, diringkas di sini */}
        <TabsContent value="consumables" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jenis Barang</CardTitle>
                <FlaskConical className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalConsumables[0].value}</div>
                <p className="text-muted-foreground text-xs">Katalog terdaftar</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>Analisis Stok</CardTitle>
                <CardDescription>
                  Perbandingan <span className="text-yellow-600">Masuk</span> vs{' '}
                  <span className="text-blue-600">Keluar</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <TransactionVolumeChart
                  labels={chartLabels}
                  datasets={[
                    {
                      label: 'Keluar',
                      data: dataBhpRequests,
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    },
                    {
                      label: 'Masuk',
                      data: dataBhpProcurements,
                      backgroundColor: 'rgba(234, 179, 8, 0.8)',
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <RecentActivityList logs={recentLogs} />
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jenis Aset</CardTitle>
                <Layers className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssetModels[0].value}</div>
                <p className="text-muted-foreground text-xs">Varian / Model aset</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle>Pertumbuhan Aset</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <TransactionVolumeChart
                  labels={chartLabels}
                  datasets={[
                    {
                      label: 'Aset Baru',
                      data: dataAssetProcurements,
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <RecentActivityList logs={recentLogs} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

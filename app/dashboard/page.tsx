import { count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import {
  Activity,
  ArrowUpRight,
  Box,
  Building2,
  Database,
  FlaskConical,
  Layers,
  MapPin,
  Package,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react'

import { TransactionVolumeChart } from '@/components/transaction-volume-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  assetModels,
  categories,
  consumables,
  fixedAssets,
  procurementAssets,
  procurementConsumables,
  procurements,
  requests,
  rooms,
  systemActivityLogs,
  units,
  user,
  warehouseStocks,
  warehouses,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export default async function Page() {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin', 'unit_admin', 'unit_staff', 'warehouse_staff'],
  })

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  oneYearAgo.setDate(1)

  /**
   * =========================================
   * DATA FETCHING
   * =========================================
   */
  const [
    // 1. Consumables Metrics
    totalConsumables,
    lowStockItems,
    pendingRequests,

    // 2. Asset Metrics
    totalFixedAssets,
    totalAssetModels,
    brokenAssets,

    // 3. Activity Logs
    recentLogs,

    // 4. Chart Data Sources
    consumableRequests,
    consumableProcurements,
    assetProcurements,

    // 5. GENERAL DATA
    totalUnits,
    totalRooms,
    totalWarehouses,
    totalCategories,
    totalUsers,
  ] = await Promise.all([
    // [BHP] Total Katalog
    db.select({ value: count() }).from(consumables),

    // [BHP] Stok Menipis (Data tetap diambil, opsi jika ingin dikembalikan)
    db
      .select({ value: count() })
      .from(warehouseStocks)
      .leftJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(sql`${warehouseStocks.quantity} <= ${consumables.minimumStock}`),

    // [BHP] Request Menunggu
    db
      .select({ value: count() })
      .from(requests)
      .where(inArray(requests.status, ['PENDING_UNIT', 'PENDING_FACULTY'])),

    // [ASSET] Total Fisik
    db.select({ value: count() }).from(fixedAssets),

    // [ASSET] Total Model (Jenis)
    db.select({ value: count() }).from(assetModels),

    // [ASSET] Rusak/Maintenance
    db
      .select({ value: count() })
      .from(fixedAssets)
      .where(sql`${fixedAssets.condition} != 'GOOD'`),

    // Logs
    db
      .select({
        action: systemActivityLogs.actionType,
        description: systemActivityLogs.description,
        createdAt: systemActivityLogs.createdAt,
        userName: user.name,
      })
      .from(systemActivityLogs)
      .leftJoin(user, eq(systemActivityLogs.actorId, user.id))
      .orderBy(desc(systemActivityLogs.createdAt))
      .limit(5),

    // Chart: Requests (BHP)
    db
      .select({ createdAt: requests.createdAt })
      .from(requests)
      .where(gte(requests.createdAt, oneYearAgo)),

    // Chart: Procurement BHP
    db
      .select({ createdAt: procurements.createdAt })
      .from(procurementConsumables)
      .innerJoin(procurements, eq(procurementConsumables.procurementId, procurements.id))
      .where(gte(procurements.createdAt, oneYearAgo)),

    // Chart: Procurement Assets
    db
      .select({ createdAt: procurements.createdAt })
      .from(procurementAssets)
      .innerJoin(procurements, eq(procurementAssets.procurementId, procurements.id))
      .where(gte(procurements.createdAt, oneYearAgo)),

    // --- NEW QUERIES FOR GENERAL TAB ---
    db.select({ value: count() }).from(units),
    db.select({ value: count() }).from(rooms),
    db.select({ value: count() }).from(warehouses),
    db.select({ value: count() }).from(categories),
    db.select({ value: count() }).from(user),
  ])

  /**
   * =========================================
   * CHART PROCESSING
   * =========================================
   */
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

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return '-'
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)
    if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
    return `${Math.floor(diffInSeconds / 86400)} hari lalu`
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-4">
      {/* HEADER */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Halo, <span className="text-foreground font-medium">{session.user.name}</span>. Berikut
          ringkasan sistem.
        </p>
      </div>

      {/* TABS */}
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

        {/* --- CONTENT TAB: UMUM --- */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Unit */}
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

            {/* 2. Ruangan */}
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

            {/* 3. Gudang */}
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

            {/* 4. Kategori */}
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
            {/* Card Tambahan: Users */}
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

            {/* Menggunakan kembali Recent Activity List */}
            <RecentActivityList logs={recentLogs} formatTime={formatTimeAgo} />
          </div>
        </TabsContent>

        {/* --- CONTENT TAB: BARANG HABIS PAKAI --- */}
        <TabsContent value="consumables" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Hanya Menampilkan 1 Card: Total Jenis Barang (Katalog) */}
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
                  Perbandingan{' '}
                  <span className="font-medium text-yellow-600">Pengadaan (Masuk)</span> vs{' '}
                  <span className="font-medium text-blue-600">Permintaan (Keluar)</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <TransactionVolumeChart
                  labels={chartLabels}
                  datasets={[
                    {
                      label: 'Permintaan (Keluar)',
                      data: dataBhpRequests,
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    },
                    {
                      label: 'Pengadaan (Masuk)',
                      data: dataBhpProcurements,
                      backgroundColor: 'rgba(234, 179, 8, 0.8)',
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <RecentActivityList logs={recentLogs} formatTime={formatTimeAgo} />
          </div>
        </TabsContent>

        {/* --- CONTENT TAB: ASET TETAP --- */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Hanya Menampilkan 1 Card: Total Jenis Aset (Model) */}
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
                <CardDescription>Tren penambahan aset tetap baru per bulan.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <TransactionVolumeChart
                  labels={chartLabels}
                  datasets={[
                    {
                      label: 'Pengadaan Aset Baru',
                      data: dataAssetProcurements,
                      backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <RecentActivityList logs={recentLogs} formatTime={formatTimeAgo} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RecentActivityList({
  logs,
  formatTime,
}: {
  logs: any[]
  formatTime: (d: Date | null) => string
}) {
  return (
    <Card className="col-span-1 flex h-full flex-col lg:col-span-3">
      <CardHeader>
        <CardTitle>Aktivitas Terkini</CardTitle>
        <CardDescription>Log sistem real-time.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-8 pr-2">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="text-muted-foreground/30 mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Belum ada aktivitas.</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div className="flex items-start" key={index}>
                <div className="mt-0.5 mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  {log.action?.includes('LOGIN') ? (
                    <Activity className="h-4 w-4 text-blue-500" />
                  ) : log.action?.includes('REQUEST') ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : log.action?.includes('STOCK') ? (
                    <Package className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div className="w-full min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm leading-none font-medium">
                      {log.userName || 'System'}
                    </p>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {log.description || log.action}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

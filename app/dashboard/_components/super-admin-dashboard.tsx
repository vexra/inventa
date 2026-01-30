import Link from 'next/link'

import { count, desc, eq, gte } from 'drizzle-orm'
import {
  Building,
  Building2,
  FileClock,
  FlaskConical,
  Landmark,
  Layers,
  LayoutDashboard,
  MapPin,
  MonitorSmartphone,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react'

import { TransactionVolumeChart } from '@/app/dashboard/_components/transaction-volume-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  assetModels,
  auditLogs,
  buildings,
  categories,
  consumables,
  faculties,
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
    totalUsers,
    totalLogs,
    totalFaculties,
    totalUnits,
    totalBuildings,
    totalRooms,
    totalWarehouses,
    totalCategories,
    totalConsumables,
    totalAssetModels,
    recentLogs,
    consumableRequests,
    consumableProcurements,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(auditLogs),

    db.select({ value: count() }).from(faculties),
    db.select({ value: count() }).from(units),
    db.select({ value: count() }).from(buildings),
    db.select({ value: count() }).from(rooms),
    db.select({ value: count() }).from(warehouses),

    db.select({ value: count() }).from(categories),
    db.select({ value: count() }).from(consumables),
    db.select({ value: count() }).from(assetModels),

    db
      .select({
        id: auditLogs.id,
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
  ])

  const chartLabels: string[] = []
  const dataBhpRequests: number[] = []
  const dataBhpProcurements: number[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    chartLabels.push(
      new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(d),
    )

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
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Halo, {currentUser.name} 👋</h2>
        <p className="text-muted-foreground">
          Selamat datang di Panel Admin. Kelola seluruh entitas sistem dari sini.
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Sistem & Keamanan
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Master Organisasi
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Master Katalog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total User</CardTitle>
                <Users className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers[0].value}</div>
                <p className="text-muted-foreground text-xs">Pengguna aktif</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Log Sistem</CardTitle>
                <FileClock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLogs[0].value}</div>
                <p className="text-muted-foreground text-xs">Aktivitas tercatat</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sesi Login</CardTitle>
                <MonitorSmartphone className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-muted-foreground text-xs">Device terhubung</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
            <Card className="col-span-1 flex flex-col lg:col-span-4">
              <CardHeader>
                <CardTitle>Akses Cepat Admin</CardTitle>
                <CardDescription>Shortcut ke menu Sistem & Keamanan.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4" asChild>
                  <Link href="/dashboard/users">
                    <span className="flex items-center gap-2 font-semibold">
                      <Users className="text-primary h-4 w-4" /> Manajemen User
                    </span>
                    <span className="text-muted-foreground text-left text-xs">
                      Tambah user, reset password, role.
                    </span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4" asChild>
                  <Link href="/dashboard/activity-logs">
                    <span className="flex items-center gap-2 font-semibold">
                      <FileClock className="text-primary h-4 w-4" /> Log Sistem
                    </span>
                    <span className="text-muted-foreground text-left text-xs">
                      Audit trail semua aktivitas user.
                    </span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-start gap-1 p-4" asChild>
                  <Link href="/dashboard/sessions">
                    <span className="flex items-center gap-2 font-semibold">
                      <MonitorSmartphone className="text-primary h-4 w-4" /> Sesi Login
                    </span>
                    <span className="text-muted-foreground text-left text-xs">
                      Pantau device yang sedang login.
                    </span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="col-span-1 lg:col-span-3">
              <RecentActivityList logs={recentLogs} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fakultas</CardTitle>
                <Building className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalFaculties[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/faculties">Lihat detail &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unit Kerja</CardTitle>
                <Building2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUnits[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/units">Lihat detail &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gedung & Fasilitas</CardTitle>
                <Landmark className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBuildings[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/buildings">Lihat detail &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ruangan</CardTitle>
                <MapPin className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRooms[0].value}</div>
                <p className="text-muted-foreground text-xs">Total titik lokasi</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gudang</CardTitle>
                <Warehouse className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalWarehouses[0].value}</div>
                <p className="text-muted-foreground text-xs">Penyimpanan logistik</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kategori Barang</CardTitle>
                <Tags className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCategories[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/categories">Kelola Kategori &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Barang Habis Pakai</CardTitle>
                <FlaskConical className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalConsumables[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/consumables">Lihat Katalog BHP &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Model Aset</CardTitle>
                <Layers className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAssetModels[0].value}</div>
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/asset-models">Lihat Model Aset &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Analisis Arus Barang (BHP)</CardTitle>
              <CardDescription>
                Tren permintaan (Request) vs pengadaan (Procurement) 12 bulan terakhir.
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

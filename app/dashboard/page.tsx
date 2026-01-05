import { count, desc, eq, gte } from 'drizzle-orm'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Download,
  Package,
  Users,
  Warehouse,
} from 'lucide-react'

import { TransactionVolumeChart } from '@/components/transaction-volume-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  items,
  procurements,
  requests,
  systemActivityLogs,
  units,
  user,
  warehouses,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export default async function Page() {
  const session = await requireAuth({
    roles: ['administrator', 'warehouse_staff', 'unit_staff', 'executive'],
  })

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  oneYearAgo.setDate(1)

  const [
    totalUsers,
    totalItems,
    totalWarehouses,
    totalUnits,
    recentLogs,
    recentRequests,
    recentProcurements,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(items),
    db.select({ value: count() }).from(warehouses),
    db.select({ value: count() }).from(units),

    db
      .select({
        action: systemActivityLogs.actionType,
        description: systemActivityLogs.description,
        createdAt: systemActivityLogs.createdAt,
        userName: user.name,
        userRole: user.role,
      })
      .from(systemActivityLogs)
      .leftJoin(user, eq(systemActivityLogs.actorId, user.id))
      .orderBy(desc(systemActivityLogs.createdAt))
      .limit(5),

    db
      .select({ createdAt: requests.createdAt })
      .from(requests)
      .where(gte(requests.createdAt, oneYearAgo)),

    db
      .select({ createdAt: procurements.createdAt })
      .from(procurements)
      .where(gte(procurements.createdAt, oneYearAgo)),
  ])

  const chartLabels: string[] = []
  const chartRequestData: number[] = []
  const chartProcurementData: number[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)

    const monthLabel = new Intl.DateTimeFormat('id-ID', {
      month: 'short',
      year: '2-digit',
    }).format(d)

    chartLabels.push(monthLabel)

    const targetMonth = d.getMonth()
    const targetYear = d.getFullYear()

    const reqCount = recentRequests.filter((r) => {
      if (!r.createdAt) return false
      const reqDate = new Date(r.createdAt)
      return reqDate.getMonth() === targetMonth && reqDate.getFullYear() === targetYear
    }).length

    const procCount = recentProcurements.filter((p) => {
      if (!p.createdAt) return false
      const procDate = new Date(p.createdAt)
      return procDate.getMonth() === targetMonth && procDate.getFullYear() === targetYear
    }).length

    chartRequestData.push(reqCount)
    chartProcurementData.push(procCount)
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Halo, <span className="text-foreground font-medium">{session.user.name}</span>. Berikut
            ringkasan aktivitas sistem.
          </p>
        </div>

        <div className="flex w-full items-center space-x-2 md:w-auto">
          <Button className="w-full bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 md:w-auto dark:bg-blue-600 dark:hover:bg-blue-500">
            <Download className="mr-2 h-4 w-4" />
            <span>Download Laporan</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers[0].value}</div>
            <p className="text-muted-foreground text-xs">Akun aktif terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jenis Persediaan</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems[0].value}</div>
            <p className="text-muted-foreground text-xs">Jenis persediaan terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gudang</CardTitle>
            <Warehouse className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWarehouses[0].value}</div>
            <p className="text-muted-foreground text-xs">Lokasi penyimpanan utama</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unit Kerja</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits[0].value}</div>
            <p className="text-muted-foreground text-xs">Departemen / Unit terdaftar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 h-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Tren Volume Transaksi</CardTitle>
            <CardDescription>Akumulasi data bulanan dalam 1 tahun terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <TransactionVolumeChart
              chartData={{
                labels: chartLabels,
                requests: chartRequestData,
                procurements: chartProcurementData,
              }}
            />
          </CardContent>
        </Card>

        <Card className="col-span-1 flex h-full flex-col lg:col-span-3">
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Log aktivitas sistem real-time.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-8 pr-2">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="text-muted-foreground/30 mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">Belum ada aktivitas tercatat.</p>
                </div>
              ) : (
                recentLogs.map((log, index) => (
                  <div className="flex items-start" key={index}>
                    <div className="mt-0.5 mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {log.action?.includes('LOGIN') ? (
                        <Activity className="h-4 w-4 text-blue-500" />
                      ) : log.action?.includes('REQUEST') ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : log.action?.includes('LOGOUT') ? (
                        <ArrowDownRight className="h-4 w-4 text-gray-500" />
                      ) : log.action?.includes('STOCK') ? (
                        <Package className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-slate-500" />
                      )}
                    </div>

                    <div className="w-full min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm leading-none font-medium">
                          {log.userName || 'Unknown User'}
                        </p>
                        <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                          {formatTimeAgo(log.createdAt)}
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
      </div>
    </div>
  )
}

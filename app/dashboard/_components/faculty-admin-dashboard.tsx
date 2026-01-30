import Link from 'next/link'

import { and, count, desc, eq, sql } from 'drizzle-orm'
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Landmark,
  PackageSearch,
  Users,
  Warehouse,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { consumables, requests, rooms, units, user, warehouseStocks, warehouses } from '@/db/schema'
import { db } from '@/lib/db'

const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export async function FacultyAdminDashboard({
  user: currentUser,
}: {
  user: { id: string; name?: string | null; facultyId?: string | null }
}) {
  if (!currentUser.facultyId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Akses Terbatas</h2>
          <p className="text-muted-foreground">
            Akun Anda belum terhubung dengan Fakultas manapun. Hubungi Super Admin.
          </p>
        </div>
      </div>
    )
  }

  const [pendingRequestCount, lowWarehouseStocks, recentRequests, stats] = await Promise.all([
    db
      .select({ count: count() })
      .from(requests)
      .innerJoin(rooms, eq(requests.roomId, rooms.id))
      .innerJoin(units, eq(rooms.unitId, units.id))
      .where(
        and(eq(units.facultyId, currentUser.facultyId), eq(requests.status, 'PENDING_FACULTY')),
      ),

    db
      .select({
        uniqueId: sql<string>`${warehouseStocks.warehouseId} || '-' || ${warehouseStocks.consumableId}`,
        itemName: consumables.name,
        warehouseName: warehouses.name,
        qty: sql<number>`sum(${warehouseStocks.quantity})`,
        minStock: consumables.minimumStock,
        unit: consumables.baseUnit,
      })
      .from(warehouseStocks)
      .innerJoin(warehouses, eq(warehouseStocks.warehouseId, warehouses.id))
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(eq(warehouses.facultyId, currentUser.facultyId))
      .groupBy(
        warehouseStocks.warehouseId,
        warehouseStocks.consumableId,
        warehouses.name,
        consumables.name,
        consumables.minimumStock,
        consumables.baseUnit,
      )
      .having(sql`sum(${warehouseStocks.quantity}) <= ${consumables.minimumStock}`)
      .limit(5),

    db
      .select({
        id: requests.id,
        code: requests.requestCode,
        unitName: units.name,
        requesterName: user.name,
        createdAt: requests.createdAt,
        status: requests.status,
      })
      .from(requests)
      .innerJoin(rooms, eq(requests.roomId, rooms.id))
      .innerJoin(units, eq(rooms.unitId, units.id))
      .innerJoin(user, eq(requests.requesterId, user.id))
      .where(eq(units.facultyId, currentUser.facultyId))
      .orderBy(desc(requests.createdAt))
      .limit(5),

    Promise.all([
      db.select({ count: count() }).from(units).where(eq(units.facultyId, currentUser.facultyId)),
      db
        .select({ count: count() })
        .from(warehouses)
        .where(eq(warehouses.facultyId, currentUser.facultyId)),
    ]),
  ])

  const pendingCount = pendingRequestCount[0]?.count || 0
  const unitCount = stats[0][0]?.count || 0
  const warehouseCount = stats[1][0]?.count || 0
  const hasLowStock = lowWarehouseStocks.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Halo, {currentUser.name} 👋</h1>
        <p className="text-muted-foreground">
          Selamat datang di Panel Administrasi Fakultas. Monitoring persetujuan dan inventaris di
          sini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className={
            pendingCount > 0
              ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/10'
              : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perlu Persetujuan</CardTitle>
            <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Permintaan unit menunggu ACC</p>
          </CardContent>
        </Card>

        <Card
          className={
            hasLowStock ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Gudang Kritis</CardTitle>
            <div
              className={`rounded-full p-2 ${
                hasLowStock
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              }`}
            >
              <Archive className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasLowStock ? lowWarehouseStocks.length : 'Aman'}
            </div>
            <p className="text-muted-foreground text-xs">
              {hasLowStock ? 'Item di bawah batas minimum' : 'Stok gudang aman'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unit Kerja</CardTitle>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitCount}</div>
            <p className="text-muted-foreground text-xs">Unit/Jurusan aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fasilitas Gudang</CardTitle>
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <Warehouse className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouseCount}</div>
            <p className="text-muted-foreground text-xs">Lokasi penyimpanan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Permintaan Barang Terbaru</CardTitle>
            <CardDescription>
              Monitoring permintaan barang dari Unit Kerja di Fakultas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Unit / Pemohon</TableHead>
                  <TableHead>Tgl</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-24 text-center text-sm"
                    >
                      Belum ada data permintaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-medium">{item.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.unitName}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {item.requesterName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'PENDING_FACULTY'
                              ? 'default'
                              : item.status === 'APPROVED' || item.status === 'COMPLETED'
                                ? 'outline'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {item.status === 'PENDING_FACULTY' ? 'Perlu Acc' : item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/consumable-requests">
                Kelola Permintaan Masuk <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex h-full flex-col lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stok Gudang Kritis</span>
              {hasLowStock && (
                <Badge
                  variant="destructive"
                  className="bg-red-100 text-[10px] text-red-600 dark:bg-red-900/30 dark:text-red-400"
                >
                  Alert
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Akumulasi stok item per gudang di bawah batas minimum.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {!hasLowStock ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500 opacity-20 dark:text-emerald-400" />
                <p className="text-sm font-medium">Semua stok gudang aman.</p>
                <p className="text-xs opacity-70">Tidak ada item yang perlu restock.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowWarehouseStocks.map((stock) => (
                  <div
                    key={stock.uniqueId}
                    className="dark:border-border flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <PackageSearch className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm leading-none font-medium">{stock.itemName}</p>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Building2 className="h-3 w-3" />
                          <span>{stock.warehouseName}</span>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Min: {stock.minStock} {stock.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {Number(stock.qty)}
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          {stock.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="mt-auto pt-6">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full text-xs">
                <Link href="/dashboard/warehouse-stocks">Cek Gudang</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full text-xs">
                <Link href="/dashboard/procurements">
                  <FileText className="mr-2 h-3 w-3" /> Lihat Pengadaan
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/dashboard/units" className="group">
          <Card className="hover:bg-muted/50 dark:hover:bg-muted/20 cursor-pointer border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Users className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
              <span className="text-sm font-medium">Kelola Unit Kerja</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/fixed-assets" className="group">
          <Card className="hover:bg-muted/50 dark:hover:bg-muted/20 cursor-pointer border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Landmark className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
              <span className="text-sm font-medium">Monitoring Aset</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/procurements" className="group">
          <Card className="hover:bg-muted/50 dark:hover:bg-muted/20 cursor-pointer border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <FileText className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
              <span className="text-sm font-medium">Daftar Pengadaan</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/buildings" className="group">
          <Card className="hover:bg-muted/50 dark:hover:bg-muted/20 cursor-pointer border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Building2 className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
              <span className="text-sm font-medium">Data Gedung</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

import Link from 'next/link'

import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  PackageSearch,
} from 'lucide-react'

import { RequestDialog } from '@/app/dashboard/consumable-requests/_components/request-dialog'
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
import {
  consumables,
  requests,
  roomConsumables,
  rooms,
  usageReports,
  warehouses as warehousesTable,
} from '@/db/schema'
import { db } from '@/lib/db'

const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export async function UnitStaffDashboard({
  user: currentUser,
}: {
  user: { id: string; name?: string | null; unitId?: string | null }
}) {
  if (!currentUser.unitId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Unit Kerja Belum Terhubung</h2>
          <p className="text-muted-foreground">
            Akun Anda belum terhubung dengan Unit/Jurusan manapun. Hubungi Admin.
          </p>
        </div>
      </div>
    )
  }

  const [userRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.unitId, currentUser.unitId))
    .limit(1)

  const [pendingRequests, lowStockItems, recentRequests, usageCount, catalogItems, warehouseList] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(requests)
        .where(and(eq(requests.requesterId, currentUser.id), eq(requests.status, 'PENDING_UNIT'))),

      userRoom
        ? db
            .select({
              id: roomConsumables.id,
              name: consumables.name,
              qty: roomConsumables.quantity,
              minStock: consumables.minimumStock,
              unit: consumables.baseUnit,
            })
            .from(roomConsumables)
            .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
            .where(
              and(
                eq(roomConsumables.roomId, userRoom.id),
                sql`${roomConsumables.quantity} <= ${consumables.minimumStock}`,
              ),
            )
            .limit(5)
        : [],

      db
        .select()
        .from(requests)
        .where(eq(requests.requesterId, currentUser.id))
        .orderBy(desc(requests.createdAt))
        .limit(5),

      db
        .select({ count: sql<number>`count(*)` })
        .from(usageReports)
        .where(eq(usageReports.userId, currentUser.id)),

      db
        .select({
          id: consumables.id,
          name: consumables.name,
          category: sql<string>`'Umum'`,
          unit: consumables.baseUnit,
        })
        .from(consumables)
        .orderBy(asc(consumables.name)),

      db.select({ id: warehousesTable.id, name: warehousesTable.name }).from(warehousesTable),
    ])

  const pendingCount = Number(pendingRequests[0]?.count || 0)
  const reportCount = Number(usageCount[0]?.count || 0)

  const hasLowStock = lowStockItems.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Halo, {currentUser.name} 👋</h1>
        <p className="text-muted-foreground">
          Selamat datang di Panel Unit Staff. Kelola stok ruangan dan permintaan barang di sini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permintaan Menunggu</CardTitle>
            <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground text-xs">Menunggu persetujuan admin unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemakaian</CardTitle>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCount}</div>
            <p className="text-muted-foreground text-xs">Laporan dibuat oleh Anda</p>
          </CardContent>
        </Card>

        <Card className={hasLowStock ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Stok Ruangan</CardTitle>
            <div
              className={`rounded-full p-2 ${
                hasLowStock
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              }`}
            >
              {hasLowStock ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasLowStock ? `${lowStockItems.length} Item` : 'Aman'}
            </div>
            <p className="text-muted-foreground text-xs">
              {hasLowStock ? 'Stok di bawah batas minimum' : 'Semua stok dalam batas aman'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Permintaan Terakhir</CardTitle>
            <CardDescription>Status pengajuan barang ke gudang.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground h-24 text-center text-sm"
                    >
                      Belum ada permintaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {req.requestCode}
                      </TableCell>
                      <TableCell>{formatDate(req.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'APPROVED' || req.status === 'COMPLETED'
                              ? 'default'
                              : req.status === 'REJECTED' || req.status === 'CANCELED'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {req.status}
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
              <Link href="/dashboard/my-requests">
                Lihat Semua Permintaan <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stok Menipis</span>
              {hasLowStock && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600">
                  Perlu Restock
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Barang yang mencapai batas minimum stok ({userRoom ? userRoom.name : '-'}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRoom ? (
              <div className="space-y-4">
                {!hasLowStock ? (
                  <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500 opacity-20" />
                    <p className="text-sm">Stok aman terkendali.</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-600">
                          <PackageSearch className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Min: {item.minStock} {item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {Number(item.qty)}
                          <span className="text-muted-foreground ml-1 text-xs font-normal">
                            {item.unit}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center text-sm">
                Ruangan belum dikonfigurasi.
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full">
              <RequestDialog items={catalogItems} warehouses={warehouseList}>
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <PackageSearch className="mr-2 h-4 w-4" /> Buat Permintaan Baru
                </Button>
              </RequestDialog>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

import Link from 'next/link'

import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  User,
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
  units,
  user,
  warehouseStocks,
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

export async function UnitAdminDashboard({
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
            Akun Admin Unit ini belum terhubung ke Unit manapun.
          </p>
        </div>
      </div>
    )
  }

  const [
    unitDataRes,
    pendingCountRes,
    roomCountRes,
    recentRequests,
    lowStockItems,
    rawStocks,
    warehouseList,
    roomList,
  ] = await Promise.all([
    db.select({ name: units.name }).from(units).where(eq(units.id, currentUser.unitId)).limit(1),

    db
      .select({ count: count() })
      .from(requests)
      .innerJoin(rooms, eq(requests.roomId, rooms.id))
      .where(and(eq(rooms.unitId, currentUser.unitId), eq(requests.status, 'PENDING_UNIT'))),

    db.select({ count: count() }).from(rooms).where(eq(rooms.unitId, currentUser.unitId)),

    db
      .select({
        id: requests.id,
        code: requests.requestCode,
        status: requests.status,
        createdAt: requests.createdAt,
        requesterName: user.name,
      })
      .from(requests)
      .innerJoin(rooms, eq(requests.roomId, rooms.id))
      .innerJoin(user, eq(requests.requesterId, user.id))
      .where(eq(rooms.unitId, currentUser.unitId))
      .orderBy(desc(requests.createdAt))
      .limit(5),

    db
      .select({
        id: roomConsumables.id,
        roomName: rooms.name,
        name: consumables.name,
        qty: roomConsumables.quantity,
        minStock: consumables.minimumStock,
        unit: consumables.baseUnit,
      })
      .from(roomConsumables)
      .innerJoin(rooms, eq(roomConsumables.roomId, rooms.id))
      .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
      .where(
        and(
          eq(rooms.unitId, currentUser.unitId),
          sql`${roomConsumables.quantity} <= ${consumables.minimumStock}`,
        ),
      )
      .limit(5),

    db
      .select({
        warehouseId: warehouseStocks.warehouseId,
        consumableId: consumables.id,
        name: consumables.name,
        unit: consumables.baseUnit,
        quantity: warehouseStocks.quantity,
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(sql`${warehouseStocks.quantity} > 0`)
      .orderBy(asc(consumables.name)),

    db.select({ id: warehousesTable.id, name: warehousesTable.name }).from(warehousesTable),

    db
      .select({ id: rooms.id, name: rooms.name })
      .from(rooms)
      .where(eq(rooms.unitId, currentUser.unitId))
      .orderBy(asc(rooms.name)),
  ])

  const unitName = unitDataRes[0]?.name || 'Unit Kerja'
  const pendingCount = pendingCountRes[0]?.count || 0
  const totalRooms = roomCountRes[0]?.count || 0
  const hasLowStock = lowStockItems.length > 0

  const availableStocks = rawStocks.map((s) => ({
    ...s,
    quantity: s.quantity ?? 0,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard {unitName}</h1>
        <p className="text-muted-foreground">
          Panel kontrol Admin Unit. Kelola persetujuan dan monitoring stok.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className={
            pendingCount > 0
              ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20'
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
            <p className="text-muted-foreground text-xs">Permintaan dari staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ruangan</CardTitle>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
            <p className="text-muted-foreground text-xs">Lab & Kantor dalam Unit</p>
          </CardContent>
        </Card>

        <Card
          className={
            hasLowStock ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : ''
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Stok</CardTitle>
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
              {hasLowStock ? 'Perlu restock segera' : 'Semua stok unit aman'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Permintaan Terbaru</CardTitle>
            <CardDescription>Daftar permintaan barang dari seluruh staff unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Pemohon</TableHead>
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
                      Belum ada aktivitas permintaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs font-medium">{req.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="text-muted-foreground h-3 w-3" />
                          <span className="text-xs">{req.requesterName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(req.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={req.status === 'PENDING_UNIT' ? 'secondary' : 'outline'}
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
              <Link href="/dashboard/consumable-requests">
                Kelola Semua Permintaan <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stok Menipis</span>
              {hasLowStock && (
                <Badge variant="destructive" className="text-[10px]">
                  Kritis
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Top 5 barang yang stoknya habis di unit ini.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <PackageSearch className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm leading-none font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {item.roomName} • Min: {item.minStock}
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
          </CardContent>
          <CardFooter>
            <div className="w-full space-y-2">
              <RequestDialog stocks={availableStocks} warehouses={warehouseList} rooms={roomList}>
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  <PackageSearch className="mr-2 h-4 w-4" /> Buat Permintaan (Unit)
                </Button>
              </RequestDialog>

              <Button asChild variant="ghost" className="w-full text-xs">
                <Link href="/dashboard/unit-stocks">Lihat Stok Seluruh Ruangan</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

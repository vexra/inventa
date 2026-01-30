import { and, asc, eq, gt, sql } from 'drizzle-orm'

import { consumables, roomConsumables, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UsageDialog } from './_components/usage-dialog'
import { UsageTable } from './_components/usage-table'
import { getUsageReports } from './actions'

interface StockItem {
  id: string
  consumableId: string
  name: string
  unit: string
  currentQty: number
  roomId: string
  batchNumber: string | null
  expiryDate: Date | null
}

interface RawUsageReport {
  id: string
  activityName: string
  activityDate: Date
  createdAt: Date | null
  user: { name: string; image: string | null } | null
  room: { id: string; name: string } | null
  details: {
    consumableId: string
    qtyUsed: string
    batchNumber: string | null
    consumable: {
      name: string
      unit: string
    }
  }[]
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function UsageReportsPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin', 'super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'createdAt'
  const sortOrder = params.order || ('desc' as 'asc' | 'desc')

  const unitRooms = await db
    .select({
      id: rooms.id,
      name: rooms.name,
    })
    .from(rooms)
    .where(eq(rooms.unitId, session.user.unitId!))
    .orderBy(asc(rooms.name))

  const unitRoomIds = unitRooms.map((r) => r.id)

  let availableStocks: StockItem[] = []

  if (unitRoomIds.length > 0) {
    const stocksRaw = await db
      .select({
        id: roomConsumables.id,
        consumableId: roomConsumables.consumableId,
        quantity: roomConsumables.quantity,
        batchNumber: roomConsumables.batchNumber,
        expiryDate: roomConsumables.expiryDate,
        roomId: roomConsumables.roomId,
        name: consumables.name,
        unit: consumables.baseUnit,
      })
      .from(roomConsumables)
      .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
      .where(and(gt(roomConsumables.quantity, sql`0`)))

    availableStocks = stocksRaw
      .filter((s) => unitRoomIds.includes(s.roomId))
      .map((s) => ({
        id: s.id,
        consumableId: s.consumableId,
        name: s.name,
        unit: s.unit,
        currentQty: Number(s.quantity),
        roomId: s.roomId,
        batchNumber: s.batchNumber,
        expiryDate: s.expiryDate,
      }))
  }

  const { data, totalItems } = await getUsageReports(
    currentPage,
    itemsPerPage,
    query,
    sortCol,
    sortOrder,
  )

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const formattedData = data.map((report: RawUsageReport) => ({
    id: report.id,
    activityName: report.activityName,
    activityDate: report.activityDate,
    createdAt: report.createdAt || new Date(),
    user: report.user,
    room: report.room,
    details: report.details,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pemakaian</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau penggunaan barang habis pakai di ruangan.
          </p>
        </div>

        {unitRooms.length > 0 && (
          <UsageDialog rooms={unitRooms} availableStocks={availableStocks} />
        )}
      </div>

      <UsageTable
        data={formattedData}
        rooms={unitRooms}
        availableStocks={availableStocks}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage: itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{
          column: sortCol,
          direction: sortOrder,
        }}
      />
    </div>
  )
}

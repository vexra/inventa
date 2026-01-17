import { and, asc, eq, sql } from 'drizzle-orm'
import { ClipboardList } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { consumables, roomConsumables, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UsageDialog } from './_components/usage-dialog'
import { UsageTable } from './_components/usage-table'
import { getUsageReports } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

interface RoomStockItem {
  consumableId: string
  name: string
  unit: string
  currentQty: number
}

export default async function UsageReportsPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['unit_staff'] })

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = 10

  const [userRoom] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.unitId, session.user.unitId!))
    .limit(1)

  let roomStocksList: RoomStockItem[] = []

  if (userRoom) {
    roomStocksList = await db
      .select({
        consumableId: consumables.id,
        name: consumables.name,
        unit: consumables.baseUnit,
        currentQty: sql<number>`${roomConsumables.quantity}`,
      })
      .from(roomConsumables)
      .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
      .where(and(eq(roomConsumables.roomId, userRoom.id), sql`${roomConsumables.quantity} > 0`))
      .orderBy(asc(consumables.name))
  }

  const { data, totalItems } = await getUsageReports(page, limit, query)
  const totalPages = Math.ceil(totalItems / limit)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ClipboardList className="h-8 w-8" />
            Laporan Pemakaian
          </h1>
          <p className="text-muted-foreground">
            Catat pemakaian barang habis pakai untuk mengurangi stok ruangan.
          </p>
        </div>
        <UsageDialog stocks={roomStocksList} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari Kode Laporan..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <UsageTable data={data} />
        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>
    </div>
  )
}

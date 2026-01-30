import { asc, eq, sql } from 'drizzle-orm'

import { consumables, rooms, warehouseStocks, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RequestDialog } from './_components/request-dialog'
import { RequestTable } from './_components/request-table'
import { getConsumableRequests } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    sort?: string
    order?: 'asc' | 'desc'
    status?: string
  }>
}

export default async function RequestConsumablesPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin', 'faculty_admin', 'warehouse_staff'],
  })
  const userRole = session.user.role

  const isUnitUser = userRole === 'unit_staff' || userRole === 'unit_admin'
  const isWarehouseUser = userRole === 'warehouse_staff'

  if (isUnitUser && !session.user.unitId) {
    return (
      <div className="p-6 text-red-500">
        Error: Akun Unit Anda tidak terhubung dengan data Unit Kerja. Hubungi Administrator.
      </div>
    )
  }

  if (isWarehouseUser && !session.user.warehouseId) {
    return (
      <div className="p-6 text-red-500">
        Error: Akun Gudang Anda tidak terhubung dengan data Gudang. Hubungi Administrator.
      </div>
    )
  }

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = 10
  const sortCol = params.sort || 'createdAt'
  const sortOrder = params.order || 'desc'
  const statusFilter = params.status || 'all'

  const [requestsData, warehousesList, aggregatedStocks, unitRooms] = await Promise.all([
    getConsumableRequests(page, limit, query, statusFilter, sortCol, sortOrder),

    db
      .select({
        id: warehouses.id,
        name: warehouses.name,
      })
      .from(warehouses)
      .orderBy(asc(warehouses.name)),

    db
      .select({
        warehouseId: warehouseStocks.warehouseId,
        consumableId: warehouseStocks.consumableId,
        name: consumables.name,
        unit: consumables.baseUnit,
        quantity: sql<number>`sum(${warehouseStocks.quantity})`.mapWith(Number),
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(sql`${warehouseStocks.quantity} > 0`)
      .groupBy(
        warehouseStocks.warehouseId,
        warehouseStocks.consumableId,
        consumables.name,
        consumables.baseUnit,
      )
      .orderBy(asc(consumables.name)),

    session.user.unitId
      ? db
          .select({
            id: rooms.id,
            name: rooms.name,
          })
          .from(rooms)
          .where(eq(rooms.unitId, session.user.unitId))
          .orderBy(asc(rooms.name))
      : Promise.resolve([]),
  ])

  const availableStocks = aggregatedStocks.map((stock) => ({
    ...stock,
    quantity: stock.quantity ?? 0,
  }))

  const { data, totalItems } = requestsData
  const totalPages = Math.ceil(totalItems / limit)

  let pageTitle = 'Permintaan Saya'
  let pageDescription = 'Ajukan permintaan barang baru dan pantau statusnya di sini.'

  if (userRole === 'unit_admin') {
    pageTitle = 'Permintaan Unit'
    pageDescription = 'Pantau dan setujui permintaan barang dari staff di Unit Kerja Anda.'
  } else if (userRole === 'faculty_admin') {
    pageTitle = 'Permintaan Fakultas'
    pageDescription = 'Verifikasi akhir permintaan barang dari berbagai unit di fakultas.'
  } else if (userRole === 'warehouse_staff') {
    pageTitle = 'Dashboard Gudang'
    pageDescription = 'Kelola permintaan masuk, siapkan barang, dan proses pengambilan via QR.'
  }

  const canCreateRequest = userRole === 'unit_staff'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>

        {canCreateRequest && (
          <RequestDialog warehouses={warehousesList} stocks={availableStocks} rooms={unitRooms} />
        )}
      </div>

      <RequestTable
        data={data}
        userRole={userRole}
        warehouses={warehousesList}
        rooms={unitRooms}
        stocks={availableStocks}
        metadata={{
          totalItems,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        }}
        currentSort={{
          column: sortCol,
          direction: sortOrder,
        }}
        currentStatusFilter={statusFilter}
      />
    </div>
  )
}
